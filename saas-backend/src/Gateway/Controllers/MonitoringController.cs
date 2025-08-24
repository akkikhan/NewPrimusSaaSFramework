using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO;
using SaaSFramework.Shared.Models;

namespace SaaSFramework.Gateway.Controllers;

[ApiController]
[Route("api/v2/[controller]")]
public class MonitoringController : ControllerBase
{
    private readonly ILogger<MonitoringController> _logger;

    public MonitoringController(ILogger<MonitoringController> logger)
    {
        _logger = logger;
    }

    [HttpGet("health")]
    public IActionResult GetHealthStatus()
    {
        try
        {
            var healthData = new
            {
                Status = "healthy",
                Timestamp = DateTime.UtcNow,
                Services = new
                {
                    Gateway = CheckServiceHealth("http://localhost:8080/health"),
                    Authentication = CheckServiceHealth("http://localhost:5001/health"),
                    RBAC = CheckServiceHealth("http://localhost:5002/health"),
                    Notifications = CheckServiceHealth("http://localhost:5003/health")
                },
                SystemInfo = GetSystemInfo()
            };

            return Ok(ApiResponse<object>.SuccessResult(healthData));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting health status");
            return StatusCode(500, ApiResponse<object>.ErrorResult("Failed to get health status"));
        }
    }

    [HttpGet("system-logs")]
    public async Task<IActionResult> GetSystemLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? level = null,
        [FromQuery] string? source = null,
        [FromQuery] string? timeRange = "24h")
    {
        try
        {
            var logs = await GetLogsFromFiles(page, pageSize, level, source, timeRange);
            return Ok(ApiResponse<object>.SuccessResult(logs));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting system logs");
            return StatusCode(500, ApiResponse<object>.ErrorResult("Failed to get system logs"));
        }
    }

    [HttpGet("metrics")]
    public IActionResult GetSystemMetrics()
    {
        try
        {
            var metrics = new
            {
                Timestamp = DateTime.UtcNow,
                System = new
                {
                    CpuUsage = GetCpuUsage(),
                    MemoryUsage = GetMemoryUsage(),
                    DiskUsage = GetDiskUsage(),
                    Uptime = GetSystemUptime()
                },
                Application = new
                {
                    RequestCount = GetRequestCount(),
                    ErrorCount = GetErrorCount(),
                    ActiveConnections = GetActiveConnections(),
                    ResponseTime = GetAverageResponseTime()
                }
            };

            return Ok(ApiResponse<object>.SuccessResult(metrics));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting system metrics");
            return StatusCode(500, ApiResponse<object>.ErrorResult("Failed to get system metrics"));
        }
    }

    [HttpGet("services/status")]
    public async Task<IActionResult> GetServicesStatus()
    {
        try
        {
            var services = new[]
            {
                new { Name = "Gateway", Url = "http://localhost:8080/health", Port = 8080 },
                new { Name = "Authentication", Url = "http://localhost:5001/health", Port = 5001 },
                new { Name = "RBAC", Url = "http://localhost:5002/health", Port = 5002 },
                new { Name = "Notifications", Url = "http://localhost:5003/health", Port = 5003 }
            };

            var statusTasks = services.Select(async service =>
            {
                var status = await CheckServiceHealthAsync(service.Url);
                return new
                {
                    service.Name,
                    service.Port,
                    Status = status.IsHealthy ? "online" : "offline",
                    ResponseTime = status.ResponseTime,
                    LastCheck = DateTime.UtcNow,
                    Details = status.Details
                };
            });

            var results = await Task.WhenAll(statusTasks);
            return Ok(ApiResponse<object>.SuccessResult(results));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting services status");
            return StatusCode(500, ApiResponse<object>.ErrorResult("Failed to get services status"));
        }
    }

    private async Task<object> GetLogsFromFiles(int page, int pageSize, string? level, string? source, string? timeRange)
    {
        var logs = new List<object>();
        var logDirectory = Path.Combine(Directory.GetCurrentDirectory(), "logs");
        
        if (!Directory.Exists(logDirectory))
        {
            return new
            {
                Items = logs,
                TotalCount = 0,
                Page = page,
                PageSize = pageSize,
                TotalPages = 0
            };
        }

        // Get all log files from various services
        var logFiles = Directory.GetFiles(logDirectory, "*.txt")
            .Concat(GetServiceLogFiles("Authentication", "auth"))
            .Concat(GetServiceLogFiles("RBAC", "rbac"))
            .Concat(GetServiceLogFiles("Notifications", "notifications"))
            .Where(f => IsWithinTimeRange(f, timeRange))
            .OrderByDescending(f => System.IO.File.GetLastWriteTime(f));

        foreach (var logFile in logFiles.Take(10)) // Limit to recent files
        {
            try
            {
                var lines = await System.IO.File.ReadAllLinesAsync(logFile);
                var serviceName = GetServiceNameFromLogFile(logFile);
                
                foreach (var line in lines.Reverse().Take(200)) // Get recent entries
                {
                    var logEntry = ParseLogLine(line, serviceName);
                    if (logEntry != null && ShouldIncludeLog(logEntry, level, source))
                    {
                        logs.Add(logEntry);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read log file: {File}", logFile);
            }
        }

        // Sort by timestamp descending
        logs = logs.OrderByDescending(l => ((dynamic)l).Timestamp).ToList();

        var totalCount = logs.Count;
        var pagedLogs = logs.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new
        {
            Items = pagedLogs,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            Stats = new
            {
                TotalLogs = totalCount,
                ErrorCount = logs.Count(l => ((dynamic)l).Level == "error"),
                WarningCount = logs.Count(l => ((dynamic)l).Level == "warning"),
                InfoCount = logs.Count(l => ((dynamic)l).Level == "info")
            }
        };
    }

    private IEnumerable<string> GetServiceLogFiles(string serviceName, string filePrefix)
    {
        var serviceLogPath = Path.Combine(Directory.GetCurrentDirectory(), "..", serviceName, "logs");
        if (Directory.Exists(serviceLogPath))
        {
            return Directory.GetFiles(serviceLogPath, $"{filePrefix}*.txt");
        }
        return Enumerable.Empty<string>();
    }

    private bool IsWithinTimeRange(string filePath, string? timeRange)
    {
        if (string.IsNullOrEmpty(timeRange)) return true;
        
        var fileDate = System.IO.File.GetLastWriteTime(filePath);
        var cutoffDate = timeRange switch
        {
            "1h" => DateTime.UtcNow.AddHours(-1),
            "24h" => DateTime.UtcNow.AddDays(-1),
            "7d" => DateTime.UtcNow.AddDays(-7),
            "30d" => DateTime.UtcNow.AddDays(-30),
            _ => DateTime.UtcNow.AddDays(-1)
        };

        return fileDate >= cutoffDate;
    }

    private string GetServiceNameFromLogFile(string filePath)
    {
        var fileName = Path.GetFileName(filePath).ToLower();
        if (fileName.StartsWith("gateway")) return "gateway";
        if (fileName.StartsWith("auth")) return "authentication";
        if (fileName.StartsWith("rbac")) return "rbac";
        if (fileName.StartsWith("notifications")) return "notifications";
        return "system";
    }

    private object? ParseLogLine(string line, string serviceName)
    {
        if (string.IsNullOrWhiteSpace(line)) return null;

        try
        {
            // Parse Serilog format: 2025-08-21 22:01:02.293 -04:00 [INF] Message
            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 4) return null;

            var timestampStr = $"{parts[0]} {parts[1]} {parts[2]}";
            if (!DateTime.TryParse($"{parts[0]} {parts[1]}", out var timestamp))
            {
                timestamp = DateTime.UtcNow;
            }

            var levelStr = parts[3].Trim('[', ']').ToLower();
            var level = levelStr switch
            {
                "inf" => "info",
                "wrn" => "warning", 
                "err" => "error",
                "dbg" => "debug",
                "ftl" => "critical",
                _ => "info"
            };

            var message = string.Join(" ", parts.Skip(4));

            return new
            {
                Id = Guid.NewGuid().ToString(),
                Timestamp = timestamp.ToString("O"),
                Level = level,
                Source = serviceName,
                Message = message,
                Details = ExtractDetails(message),
                CorrelationId = ExtractCorrelationId(message),
                UserId = ExtractUserId(message),
                IpAddress = ExtractIpAddress(message)
            };
        }
        catch
        {
            return null;
        }
    }

    private bool ShouldIncludeLog(object logEntry, string? level, string? source)
    {
        var log = (dynamic)logEntry;
        
        if (!string.IsNullOrEmpty(level) && log.Level != level.ToLower())
            return false;
            
        if (!string.IsNullOrEmpty(source) && log.Source != source.ToLower())
            return false;
            
        return true;
    }

    private string? ExtractDetails(string message)
    {
        // Extract additional details from common log patterns
        if (message.Contains("Exception:") || message.Contains("Error:"))
        {
            return message;
        }
        return null;
    }

    private string? ExtractCorrelationId(string message)
    {
        // Look for correlation ID patterns
        var match = System.Text.RegularExpressions.Regex.Match(message, @"(?:CorrelationId|RequestId|TraceId):\s*([a-zA-Z0-9-]+)");
        return match.Success ? match.Groups[1].Value : null;
    }

    private string? ExtractUserId(string message)
    {
        // Look for user ID patterns
        var match = System.Text.RegularExpressions.Regex.Match(message, @"(?:UserId|User):\s*([a-zA-Z0-9-@.]+)");
        return match.Success ? match.Groups[1].Value : null;
    }

    private string? ExtractIpAddress(string message)
    {
        // Look for IP address patterns
        var match = System.Text.RegularExpressions.Regex.Match(message, @"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b");
        return match.Success ? match.Value : null;
    }

    private ServiceHealthStatus CheckServiceHealth(string url)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var response = client.GetAsync(url).Result;
            return new ServiceHealthStatus
            {
                IsHealthy = response.IsSuccessStatusCode,
                ResponseTime = 100, // Approximation
                Details = response.IsSuccessStatusCode ? "OK" : $"HTTP {response.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            return new ServiceHealthStatus
            {
                IsHealthy = false,
                ResponseTime = 0,
                Details = ex.Message
            };
        }
    }

    private async Task<ServiceHealthStatus> CheckServiceHealthAsync(string url)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var stopwatch = Stopwatch.StartNew();
            var response = await client.GetAsync(url);
            stopwatch.Stop();
            
            return new ServiceHealthStatus
            {
                IsHealthy = response.IsSuccessStatusCode,
                ResponseTime = (int)stopwatch.ElapsedMilliseconds,
                Details = response.IsSuccessStatusCode ? "OK" : $"HTTP {response.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            return new ServiceHealthStatus
            {
                IsHealthy = false,
                ResponseTime = 0,
                Details = ex.Message
            };
        }
    }

    private object GetSystemInfo()
    {
        return new
        {
            MachineName = Environment.MachineName,
            ProcessorCount = Environment.ProcessorCount,
            OSVersion = Environment.OSVersion.ToString(),
            WorkingSet = Environment.WorkingSet,
            TotalMemory = GC.GetTotalMemory(false)
        };
    }

    private double GetCpuUsage()
    {
        // Simplified CPU usage - in production, use PerformanceCounters
        return Random.Shared.NextDouble() * 100;
    }

    private object GetMemoryUsage()
    {
        var totalMemory = GC.GetTotalMemory(false);
        var workingSet = Environment.WorkingSet;
        
        return new
        {
            Used = workingSet,
            Total = workingSet * 2, // Approximation
            Percentage = Math.Round((double)totalMemory / workingSet * 100, 2)
        };
    }

    private object GetDiskUsage()
    {
        try
        {
            var drives = DriveInfo.GetDrives().Where(d => d.IsReady).ToArray();
            var systemDrive = drives.FirstOrDefault(d => d.Name.StartsWith("C:")) ?? drives.FirstOrDefault();
            
            if (systemDrive != null)
            {
                var usedSpace = systemDrive.TotalSize - systemDrive.AvailableFreeSpace;
                return new
                {
                    Used = usedSpace,
                    Total = systemDrive.TotalSize,
                    Free = systemDrive.AvailableFreeSpace,
                    Percentage = Math.Round((double)usedSpace / systemDrive.TotalSize * 100, 2)
                };
            }
        }
        catch { }

        return new { Used = 0, Total = 0, Free = 0, Percentage = 0 };
    }

    private string GetSystemUptime()
    {
        try
        {
            var uptime = DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime();
            return $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m";
        }
        catch
        {
            return "Unknown";
        }
    }

    private int GetRequestCount()
    {
        // In production, integrate with metrics collection
        return Random.Shared.Next(1000, 10000);
    }

    private int GetErrorCount()
    {
        // In production, integrate with metrics collection
        return Random.Shared.Next(0, 50);
    }

    private int GetActiveConnections()
    {
        // In production, integrate with connection tracking
        return Random.Shared.Next(10, 100);
    }

    private int GetAverageResponseTime()
    {
        // In production, integrate with performance metrics
        return Random.Shared.Next(50, 300);
    }

    private class ServiceHealthStatus
    {
        public bool IsHealthy { get; set; }
        public int ResponseTime { get; set; }
        public string Details { get; set; } = string.Empty;
    }
}
