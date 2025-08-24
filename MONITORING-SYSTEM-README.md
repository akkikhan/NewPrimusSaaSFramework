# 🚀 SaaS Framework - Enhanced Monitoring System

## Overview

This comprehensive monitoring system provides real-time visibility into your SaaS Framework's health, performance, and operational status. Built with enterprise-grade features for production readiness.

## 🌟 Features

### 📊 Real-time System Monitoring
- **Live Health Dashboard**: Real-time service status with health indicators
- **System Metrics**: CPU, memory, disk usage, and response times
- **Service Discovery**: Automatic detection and monitoring of all microservices
- **Alert Thresholds**: Configurable warning and critical alert levels

### 📈 Performance Analytics
- **KPI Dashboard**: Key performance indicators with trend analysis
- **Response Time Tracking**: API endpoint performance monitoring
- **Throughput Metrics**: Request/response volume analytics
- **Health Scoring**: Automated system health scoring with recommendations

### 📋 Comprehensive Logging
- **Centralized Log Viewer**: Live streaming of all service logs
- **Advanced Filtering**: Filter by service, level, timestamp, and content
- **Export Functionality**: Download logs in multiple formats (JSON, CSV, TXT)
- **Log Aggregation**: Combines logs from all microservices

### 🔍 Audit Trail System
- **Complete Audit Logs**: Track all user actions and system events
- **Compliance Ready**: Built for SOC2, GDPR, and other compliance requirements
- **Export & Reporting**: Generate audit reports with filtering and date ranges
- **Security Monitoring**: Track authentication, authorization, and access events

## 🏗️ Architecture

### Backend Components

#### MonitoringController.cs
```csharp
// Comprehensive monitoring API with endpoints for:
- /api/monitoring/health          // System health aggregation
- /api/monitoring/logs           // System logs retrieval
- /api/monitoring/metrics        // Performance metrics
- /api/monitoring/services       // Service status monitoring
- /api/monitoring/audit          // Audit trail access
```

**Key Features:**
- Real-time health aggregation across all services
- Intelligent log parsing and filtering
- Performance metrics collection with caching
- Service discovery and health validation

### Frontend Components

#### 1. SystemMonitoringComponent
**Path:** `/monitoring/system`
- Real-time dashboard with auto-refresh
- Service health cards with status indicators
- System metrics visualization
- Responsive design for all screen sizes

#### 2. PerformanceMetricsComponent
**Path:** `/monitoring/performance`
- KPI cards with performance scoring
- Mock chart components (ready for chart library integration)
- Performance recommendations engine
- Trend analysis and historical data support

#### 3. SystemLogsComponent
**Path:** `/monitoring/logs`
- Live log streaming with auto-refresh
- Advanced filtering by service, level, and content
- Export functionality (JSON, CSV, TXT)
- Pagination and search capabilities

#### 4. AuditLogsComponent
**Path:** `/monitoring/audit`
- Comprehensive audit trail viewer
- Advanced filtering with date ranges
- Detailed modal views for log inspection
- Export functionality for compliance reporting
- Statistics dashboard with audit metrics

## 🚀 Quick Start

### 1. Start the Complete System
```bash
# Start all services with monitoring
.\start-monitoring-system.ps1
```

### 2. Access the Monitoring Dashboard
- **Main Dashboard**: http://localhost:4200/dashboard
- **System Monitoring**: http://localhost:4200/monitoring/system
- **Performance Metrics**: http://localhost:4200/monitoring/performance
- **System Logs**: http://localhost:4200/monitoring/logs
- **Audit Trail**: http://localhost:4200/monitoring/audit

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:8080/api/monitoring/health

# System metrics
curl http://localhost:8080/api/monitoring/metrics

# Recent logs
curl "http://localhost:8080/api/monitoring/logs?limit=100"

# Service status
curl http://localhost:8080/api/monitoring/services
```

## 📱 Navigation

The monitoring system is integrated into the main navigation sidebar:

```
SYSTEM MONITORING
├── System Overview    (/monitoring/system)
├── Performance       (/monitoring/performance)
├── System Logs       (/monitoring/logs)
└── Audit Trail       (/monitoring/audit)
```

## 🔧 Configuration

### Backend Configuration
Add to `appsettings.json`:
```json
{
  "Monitoring": {
    "RefreshIntervalMs": 5000,
    "MaxLogEntries": 1000,
    "HealthCheckTimeoutMs": 10000,
    "EnableMetricsCollection": true
  }
}
```

### Frontend Configuration
Configure refresh intervals in component constructors:
```typescript
// Auto-refresh every 5 seconds
private refreshInterval = 5000;
```

## 📊 API Reference

### Health Check API
**GET** `/api/monitoring/health`
```json
{
  "status": "Healthy",
  "totalServices": 4,
  "healthyServices": 4,
  "unhealthyServices": 0,
  "services": [
    {
      "name": "Gateway",
      "status": "Healthy",
      "responseTime": "15ms",
      "lastChecked": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### System Logs API
**GET** `/api/monitoring/logs?service=Gateway&level=Error&limit=100`
```json
{
  "logs": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "level": "Error",
      "service": "Gateway",
      "message": "Connection timeout",
      "details": "Full error details..."
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

### Metrics API
**GET** `/api/monitoring/metrics`
```json
{
  "systemMetrics": {
    "cpuUsage": 45.2,
    "memoryUsage": 67.8,
    "diskUsage": 23.4,
    "activeConnections": 156
  },
  "performanceMetrics": {
    "averageResponseTime": 125,
    "requestsPerSecond": 89,
    "errorRate": 0.02
  }
}
```

### Audit Logs API
**GET** `/api/monitoring/audit?startDate=2024-01-01&endDate=2024-01-31`
```json
{
  "auditLogs": [
    {
      "id": "audit-001",
      "timestamp": "2024-01-01T12:00:00Z",
      "action": "UserLogin",
      "userId": "user123",
      "details": {
        "ip": "192.168.1.100",
        "userAgent": "Browser/1.0"
      },
      "result": "Success"
    }
  ],
  "totalCount": 1,
  "statistics": {
    "totalEvents": 1000,
    "successfulEvents": 980,
    "failedEvents": 20
  }
}
```

## 🛠️ Development

### Adding New Metrics
1. **Backend**: Extend `MonitoringController.cs`
```csharp
[HttpGet("custom-metrics")]
public async Task<IActionResult> GetCustomMetrics()
{
    // Implement custom metrics collection
    return Ok(customMetrics);
}
```

2. **Frontend**: Update `ApiService.ts`
```typescript
getCustomMetrics(): Observable<any> {
  return this.http.get(`${this.baseUrl}/monitoring/custom-metrics`);
}
```

### Adding New Log Sources
1. Configure additional log file paths in `MonitoringController.cs`
2. Update log parsing logic for new log formats
3. Add service filters in frontend components

### Extending Audit Logging
1. Add new audit event types in the backend
2. Configure audit log storage and retention
3. Update frontend filtering and export options

## 🔍 Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check port availability
netstat -an | findstr ":8080"
netstat -an | findstr ":4200"

# Restore dependencies
cd saas-backend && dotnet restore
cd saas-frontend && npm install
```

#### Monitoring API Not Responding
1. Check if Gateway service is running on port 8080
2. Verify CORS configuration in Gateway
3. Check browser developer tools for network errors

#### Real-time Updates Not Working
1. Verify auto-refresh intervals in components
2. Check for JavaScript errors in browser console
3. Ensure API endpoints are returning valid JSON

### Log Files Location
- **Gateway**: `saas-backend/src/Gateway/logs/`
- **Authentication**: `saas-backend/src/Authentication/logs/`
- **RBAC**: `saas-backend/src/RBAC/logs/`
- **Notifications**: `saas-backend/src/Notifications/logs/`

## 🚀 Production Deployment

### Recommended Configurations

#### High Availability
- Deploy multiple instances of each service
- Configure load balancing for monitoring APIs
- Set up centralized logging (ELK stack or Azure Monitor)

#### Performance Optimization
- Enable response caching for metrics APIs
- Configure appropriate refresh intervals
- Use database for audit log storage in production

#### Security
- Enable authentication for monitoring endpoints
- Configure role-based access for sensitive metrics
- Set up audit log encryption and retention policies

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review service logs in the console windows
3. Use the built-in monitoring system to diagnose issues
4. Check the API endpoints directly for raw data

## 🎯 Next Steps

1. **Chart Integration**: Add Chart.js or D3.js for advanced visualizations
2. **Alert System**: Implement email/SMS alerts for critical issues
3. **Historical Data**: Add database storage for metrics history
4. **Custom Dashboards**: Allow users to create custom monitoring views
5. **Mobile App**: Create mobile monitoring application
6. **AI Analytics**: Add machine learning for predictive monitoring

---

## 📁 File Structure

```
saas-backend/src/Gateway/Controllers/
└── MonitoringController.cs         # Main monitoring API

saas-frontend/src/app/
├── core/services/
│   └── api.service.ts              # Enhanced with monitoring endpoints
├── components/monitoring/
│   ├── system-monitoring.component.ts
│   ├── performance-metrics.component.ts
│   ├── system-logs.component.ts
│   └── audit-logs.component.ts
└── components/dashboard/
    └── dashboard-layout.component.ts # Updated navigation

Scripts/
├── start-monitoring-system.ps1     # Complete system startup
└── stop-all-services.ps1          # Clean shutdown
```

This monitoring system provides enterprise-grade visibility and operational intelligence for your SaaS Framework. 🚀
