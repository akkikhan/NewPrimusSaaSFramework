using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;

namespace SaaSFramework.Shared.Services.Caching;

public interface IDistributedCacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class;
    Task SetAsync<T>(string key, T value, DistributedCacheEntryOptions options, CancellationToken cancellationToken = default) where T : class;
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);
    Task RefreshAsync(string key, CancellationToken cancellationToken = default);
    Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class;
    Task InvalidatePatternAsync(string pattern, CancellationToken cancellationToken = default);
    Task<Dictionary<string, T?>> GetManyAsync<T>(IEnumerable<string> keys, CancellationToken cancellationToken = default) where T : class;
    Task SetManyAsync<T>(Dictionary<string, T> keyValuePairs, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class;
}

/// <summary>
/// Distributed caching service with Redis backend for session management and performance optimization
/// Implements advanced caching patterns including cache-aside, write-through, and cache invalidation
/// </summary>
public class DistributedCacheService : IDistributedCacheService
{
    private readonly IDistributedCache _distributedCache;
    private readonly ILogger<DistributedCacheService> _logger;
    private readonly IDatabase? _redisDatabase;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly string _keyPrefix;

    public DistributedCacheService(
        IDistributedCache distributedCache,
        ILogger<DistributedCacheService> logger,
        IDatabase? redisDatabase = null,
        string keyPrefix = "saas:")
    {
        _distributedCache = distributedCache ?? throw new ArgumentNullException(nameof(distributedCache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _redisDatabase = redisDatabase;
        _keyPrefix = keyPrefix;

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        var fullKey = GetFullKey(key);
        
        try
        {
            _logger.LogDebug("Getting cache value for key: {Key}", fullKey);

            var cachedValue = await _distributedCache.GetStringAsync(fullKey, cancellationToken);
            
            if (string.IsNullOrEmpty(cachedValue))
            {
                _logger.LogDebug("Cache miss for key: {Key}", fullKey);
                return null;
            }

            var result = JsonSerializer.Deserialize<T>(cachedValue, _jsonOptions);
            _logger.LogDebug("Cache hit for key: {Key}", fullKey);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache value for key: {Key}", fullKey);
            return null; // Graceful degradation - return null on cache errors
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class
    {
        var options = new DistributedCacheEntryOptions();
        
        if (expiration.HasValue)
        {
            options.SetAbsoluteExpiration(expiration.Value);
        }
        else
        {
            // Default expiration: 1 hour
            options.SetAbsoluteExpiration(TimeSpan.FromHours(1));
        }

        await SetAsync(key, value, options, cancellationToken);
    }

    public async Task SetAsync<T>(string key, T value, DistributedCacheEntryOptions options, CancellationToken cancellationToken = default) where T : class
    {
        var fullKey = GetFullKey(key);
        
        try
        {
            _logger.LogDebug("Setting cache value for key: {Key}", fullKey);

            var serializedValue = JsonSerializer.Serialize(value, _jsonOptions);
            await _distributedCache.SetStringAsync(fullKey, serializedValue, options, cancellationToken);
            
            _logger.LogDebug("Cache value set for key: {Key}", fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache value for key: {Key}", fullKey);
            // Don't throw - allow graceful degradation
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        var fullKey = GetFullKey(key);
        
        try
        {
            _logger.LogDebug("Removing cache value for key: {Key}", fullKey);
            await _distributedCache.RemoveAsync(fullKey, cancellationToken);
            _logger.LogDebug("Cache value removed for key: {Key}", fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache value for key: {Key}", fullKey);
        }
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        if (_redisDatabase != null)
        {
            try
            {
                var fullKey = GetFullKey(key);
                return await _redisDatabase.KeyExistsAsync(fullKey);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking cache key existence: {Key}", key);
                return false;
            }
        }

        // Fallback: try to get the value
        return await GetAsync<object>(key, cancellationToken) != null;
    }

    public async Task RefreshAsync(string key, CancellationToken cancellationToken = default)
    {
        var fullKey = GetFullKey(key);
        
        try
        {
            _logger.LogDebug("Refreshing cache value for key: {Key}", fullKey);
            await _distributedCache.RefreshAsync(fullKey, cancellationToken);
            _logger.LogDebug("Cache value refreshed for key: {Key}", fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing cache value for key: {Key}", fullKey);
        }
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class
    {
        // Try to get from cache first
        var cachedValue = await GetAsync<T>(key, cancellationToken);
        if (cachedValue != null)
        {
            return cachedValue;
        }

        try
        {
            _logger.LogDebug("Cache miss for key {Key}, executing factory function", key);
            
            // Execute factory function to get the value
            var value = await factory();
            
            if (value != null)
            {
                // Set in cache for future requests
                await SetAsync(key, value, expiration, cancellationToken);
            }
            
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrSetAsync factory function for key: {Key}", key);
            throw; // Re-throw factory exceptions
        }
    }

    public async Task InvalidatePatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        if (_redisDatabase != null)
        {
            try
            {
                _logger.LogDebug("Invalidating cache keys matching pattern: {Pattern}", pattern);
                
                var server = _redisDatabase.Multiplexer.GetServer(_redisDatabase.Multiplexer.GetEndPoints().First());
                var fullPattern = GetFullKey(pattern);
                
                var keys = server.Keys(pattern: fullPattern).ToArray();
                
                if (keys.Length > 0)
                {
                    await _redisDatabase.KeyDeleteAsync(keys);
                    _logger.LogInformation("Invalidated {Count} cache keys matching pattern: {Pattern}", keys.Length, pattern);
                }
                else
                {
                    _logger.LogDebug("No cache keys found matching pattern: {Pattern}", pattern);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error invalidating cache pattern: {Pattern}", pattern);
            }
        }
        else
        {
            _logger.LogWarning("Pattern invalidation not supported without direct Redis access for pattern: {Pattern}", pattern);
        }
    }

    public async Task<Dictionary<string, T?>> GetManyAsync<T>(IEnumerable<string> keys, CancellationToken cancellationToken = default) where T : class
    {
        var result = new Dictionary<string, T?>();
        var keysList = keys.ToList();
        
        if (!keysList.Any())
        {
            return result;
        }

        if (_redisDatabase != null)
        {
            try
            {
                // Use Redis batch operations for better performance
                var fullKeys = keysList.Select(k => (RedisKey)GetFullKey(k)).ToArray();
                var values = await _redisDatabase.StringGetAsync(fullKeys);
                
                for (int i = 0; i < keysList.Count; i++)
                {
                    var originalKey = keysList[i];
                    var value = values[i];
                    
                    if (value.HasValue && !string.IsNullOrEmpty(value))
                    {
                        try
                        {
                            var deserializedValue = JsonSerializer.Deserialize<T>(value!, _jsonOptions);
                            result[originalKey] = deserializedValue;
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogError(ex, "Error deserializing cache value for key: {Key}", originalKey);
                            result[originalKey] = null;
                        }
                    }
                    else
                    {
                        result[originalKey] = null;
                    }
                }
                
                _logger.LogDebug("Retrieved {Count} cache values in batch operation", keysList.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch cache retrieval");
                
                // Fallback to individual requests
                foreach (var key in keysList)
                {
                    result[key] = await GetAsync<T>(key, cancellationToken);
                }
            }
        }
        else
        {
            // Fallback: individual requests
            foreach (var key in keysList)
            {
                result[key] = await GetAsync<T>(key, cancellationToken);
            }
        }

        return result;
    }

    public async Task SetManyAsync<T>(Dictionary<string, T> keyValuePairs, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class
    {
        if (!keyValuePairs.Any())
        {
            return;
        }

        if (_redisDatabase != null)
        {
            try
            {
                // Use Redis batch operations
                var batch = _redisDatabase.CreateBatch();
                var tasks = new List<Task>();
                
                foreach (var kvp in keyValuePairs)
                {
                    var fullKey = GetFullKey(kvp.Key);
                    var serializedValue = JsonSerializer.Serialize(kvp.Value, _jsonOptions);
                    
                    if (expiration.HasValue)
                    {
                        tasks.Add(batch.StringSetAsync(fullKey, serializedValue, expiration.Value));
                    }
                    else
                    {
                        tasks.Add(batch.StringSetAsync(fullKey, serializedValue, TimeSpan.FromHours(1)));
                    }
                }
                
                batch.Execute();
                await Task.WhenAll(tasks);
                
                _logger.LogDebug("Set {Count} cache values in batch operation", keyValuePairs.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in batch cache set operation");
                
                // Fallback to individual requests
                foreach (var kvp in keyValuePairs)
                {
                    await SetAsync(kvp.Key, kvp.Value, expiration, cancellationToken);
                }
            }
        }
        else
        {
            // Fallback: individual requests
            foreach (var kvp in keyValuePairs)
            {
                await SetAsync(kvp.Key, kvp.Value, expiration, cancellationToken);
            }
        }
    }

    private string GetFullKey(string key)
    {
        return $"{_keyPrefix}{key}";
    }
}

/// <summary>
/// Session-specific caching service for user session management
/// </summary>
public class SessionCacheService
{
    private readonly IDistributedCacheService _cacheService;
    private readonly ILogger<SessionCacheService> _logger;
    private const string SESSION_PREFIX = "session:";
    private const string USER_SESSION_PREFIX = "user-sessions:";

    public SessionCacheService(IDistributedCacheService cacheService, ILogger<SessionCacheService> logger)
    {
        _cacheService = cacheService ?? throw new ArgumentNullException(nameof(cacheService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<T?> GetSessionDataAsync<T>(string sessionId, string key, CancellationToken cancellationToken = default) where T : class
    {
        var sessionKey = $"{SESSION_PREFIX}{sessionId}:{key}";
        return await _cacheService.GetAsync<T>(sessionKey, cancellationToken);
    }

    public async Task SetSessionDataAsync<T>(string sessionId, string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default) where T : class
    {
        var sessionKey = $"{SESSION_PREFIX}{sessionId}:{key}";
        var sessionExpiration = expiration ?? TimeSpan.FromHours(24); // Default 24 hour session
        await _cacheService.SetAsync(sessionKey, value, sessionExpiration, cancellationToken);
    }

    public async Task InvalidateSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        var pattern = $"{SESSION_PREFIX}{sessionId}:*";
        await _cacheService.InvalidatePatternAsync(pattern, cancellationToken);
        _logger.LogInformation("Session invalidated: {SessionId}", sessionId);
    }

    public async Task InvalidateUserSessionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var userSessionsKey = $"{USER_SESSION_PREFIX}{userId}";
        var sessions = await _cacheService.GetAsync<List<string>>(userSessionsKey, cancellationToken);
        
        if (sessions != null)
        {
            foreach (var sessionId in sessions)
            {
                await InvalidateSessionAsync(sessionId, cancellationToken);
            }
            
            await _cacheService.RemoveAsync(userSessionsKey, cancellationToken);
            _logger.LogInformation("All sessions invalidated for user: {UserId}", userId);
        }
    }

    public async Task TrackUserSessionAsync(string userId, string sessionId, CancellationToken cancellationToken = default)
    {
        var userSessionsKey = $"{USER_SESSION_PREFIX}{userId}";
        var sessions = await _cacheService.GetAsync<List<string>>(userSessionsKey, cancellationToken) ?? new List<string>();
        
        if (!sessions.Contains(sessionId))
        {
            sessions.Add(sessionId);
            await _cacheService.SetAsync(userSessionsKey, sessions, TimeSpan.FromDays(30), cancellationToken);
        }
    }
}
