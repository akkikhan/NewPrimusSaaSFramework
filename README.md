# Primus SaaS Framework - Multi-Tenant Enterprise Solution

A comprehensive, production-ready SaaS framework built with .NET Core backend and Angular frontend, featuring advanced monitoring, authentication, and multi-tenant architecture.

## 🔐 Security Notice

**Important**: This repository contains demo code with placeholder values. Before deploying to production:

1. **Never commit real secrets** - Use environment variables or Azure Key Vault
2. **Copy `.env.example` to `.env`** and fill in your actual values
3. **Review all configuration files** and replace placeholder values
4. **Enable Azure Key Vault** for production deployments
5. **Set up proper authentication** with Azure AD or your preferred provider

## 🚀 Features

### Core Services
- **Gateway Service** - API Gateway with routing and load balancing
- **Authentication Service** - JWT-based authentication with role management
- **RBAC Service** - Role-Based Access Control with fine-grained permissions
- **Notifications Service** - Real-time notifications and messaging

### Monitoring & Analytics
- **Real-time System Health Dashboard** - Live monitoring of all services
- **Performance Metrics & Analytics** - KPIs, trends, and performance insights
- **Comprehensive System Logs** - Live log streaming and filtering
- **Audit Trail** - Complete compliance logs with export functionality
- **Automated Health Checks** - Proactive monitoring and alerting

### Frontend Features
- **Modern Angular Application** - Responsive, mobile-friendly interface
- **Dynamic Dashboard** - Real-time metrics and system overview
- **Advanced Monitoring UI** - Interactive charts and analytics
- **Audit Management** - Comprehensive audit trail viewer

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│  Angular Frontend│    │   Gateway API   │
│   (Port 4200)   │    │   (Port 8080)   │
└─────────────────┘    └─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Auth     │    │    RBAC     │    │Notifications│
│ (Port 5001) │    │ (Port 5002) │    │ (Port 5003) │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🛠️ Technology Stack

### Backend
- **.NET 8.0** - Modern C# framework
- **ASP.NET Core** - Web API development
- **Entity Framework Core** - Database ORM
- **JWT Authentication** - Secure token-based auth
- **Docker** - Containerization support

### Frontend
- **Angular 17+** - Modern TypeScript framework
- **Angular Material** - UI component library
- **RxJS** - Reactive programming
- **Chart.js** - Data visualization
- **SCSS** - Advanced styling

### DevOps & Deployment
- **Docker Compose** - Multi-container orchestration
- **Azure Container Apps** - Cloud-native deployment
- **PowerShell Scripts** - Automated deployment
- **Azure DevOps** - CI/CD pipeline support

## 🚀 Quick Start

### Prerequisites
- .NET 8.0 SDK
- Node.js 18+ and npm
- Docker (optional)
- PowerShell (Windows)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saas-framework.git
   cd saas-framework
   ```

2. **Start all services with monitoring**
   ```powershell
   .\start-monitoring-system-fixed.ps1
   ```

3. **Access the application**
   - Main Dashboard: http://localhost:4200/dashboard
   - System Monitoring: http://localhost:4200/monitoring/system
   - API Gateway: http://localhost:8080

### Manual Setup

If you prefer to start services individually:

1. **Backend Services**
   ```powershell
   # Gateway Service
   cd saas-backend\src\Gateway
   dotnet run

   # Authentication Service (new terminal)
   cd saas-backend\src\Authentication
   dotnet run

   # RBAC Service (new terminal)
   cd saas-backend\src\RBAC
   dotnet run

   # Notifications Service (new terminal)
   cd saas-backend\src\Notifications
   dotnet run
   ```

2. **Frontend Application**
   ```powershell
   cd saas-frontend
   npm install
   npm start
   ```

## 📊 Monitoring Features

### System Overview Dashboard
- Real-time service health status
- Performance metrics and KPIs
- Resource utilization monitoring
- Service dependency visualization

### Performance Analytics
- Response time trends
- Error rate monitoring
- Throughput analysis
- Custom metrics dashboard

### System Logs
- Live log streaming
- Advanced filtering and search
- Log level categorization
- Export functionality

### Audit Trail
- Comprehensive audit logging
- User activity tracking
- Security event monitoring
- Compliance reporting

## 🔧 Configuration

### Environment Variables
```bash
# Database Configuration
ConnectionString="YourDatabaseConnection"

# JWT Configuration
JwtSecret="YourSecretKey"
JwtIssuer="YourIssuer"
JwtAudience="YourAudience"

# Service URLs
GatewayUrl="http://localhost:8080"
AuthUrl="http://localhost:5001"
RbacUrl="http://localhost:5002"
NotificationsUrl="http://localhost:5003"
```

### Service Ports
- **Frontend**: 4200
- **Gateway**: 8080
- **Authentication**: 5001
- **RBAC**: 5002
- **Notifications**: 5003

## 🐳 Docker Deployment

### Local Development
```bash
docker-compose up -d
```

### Production Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## ☁️ Azure Deployment

### Container Apps Deployment
```powershell
.\deploy\deploy-containerapps.ps1
```

### Azure Setup
```powershell
.\deploy\azure-setup.ps1
```

## 📖 API Documentation

### Monitoring Endpoints
- `GET /api/monitoring/health` - Service health check
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/monitoring/logs` - System logs
- `GET /api/monitoring/services` - Service status
- `GET /api/monitoring/audit` - Audit logs

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - User profile
- `POST /api/auth/refresh` - Token refresh

### RBAC Endpoints
- `GET /api/rbac/roles` - List roles
- `POST /api/rbac/assign` - Assign role
- `GET /api/rbac/permissions` - List permissions

## 🧪 Testing

### Backend Tests
```powershell
cd saas-backend
dotnet test
```

### Frontend Tests
```powershell
cd saas-frontend
npm test
```

### Integration Tests
```powershell
npm run test:e2e
```

## 🚀 Production Considerations

### Security
- JWT token expiration and refresh
- Role-based access control
- Input validation and sanitization
- HTTPS enforcement
- Security headers

### Performance
- Database connection pooling
- Caching strategies
- Load balancing
- CDN integration
- Image optimization

### Monitoring
- Application Insights integration
- Custom metrics and alerts
- Log aggregation
- Performance monitoring
- Error tracking

## 📋 Scripts Reference

- `start-monitoring-system-fixed.ps1` - Start all services with monitoring
- `stop-all-services.ps1` - Stop all running services
- `quick-deploy.ps1` - Quick deployment script
- `setup-complete.ps1` - Initial setup and configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Review the documentation guides
- Check the troubleshooting section

## 🎯 Roadmap

- [ ] Kubernetes deployment support
- [ ] Advanced analytics dashboard
- [ ] Multi-database support
- [ ] API rate limiting
- [ ] Advanced caching
- [ ] Microservices orchestration
- [ ] AI-powered monitoring

---

**Built with ❤️ for enterprise SaaS applications**
