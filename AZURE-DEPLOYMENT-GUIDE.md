# 🚀 SaaS Framework - Azure Global Deployment Guide

## 📋 **Prerequisites Installation**

Your system needs these tools to deploy to Azure:

### 1. ✅ **Azure CLI** - Already Installed
✅ Azure CLI is detected and ready

### 2. ❌ **Azure Developer CLI (AZD)** - NEEDS INSTALLATION
```powershell
# Install Azure Developer CLI
winget install microsoft.azd
# OR using PowerShell
powershell -ex AllSigned -c "Invoke-RestMethod 'https://aka.ms/install-azd.ps1' | Invoke-Expression"
```

### 3. ⚠️ **Docker Desktop** - NEEDS TO BE STARTED
✅ Docker is installed but not running
Please start Docker Desktop from your Start menu

---

## 🚀 **Quick Deployment Steps**

### **Step 1: Install AZD**
```powershell
winget install microsoft.azd
```

### **Step 2: Start Docker Desktop**
- Open Docker Desktop from Start menu
- Wait for it to fully start (whale icon in system tray)

### **Step 3: Initialize AZD**
```powershell
cd "C:\Users\AkkiKhan\Documents\New Primus SaaS Framework"
azd auth login
azd init
```

### **Step 4: Configure Environment**
```powershell
# Set required environment variables
azd env set JWT_SECRET "your-super-secret-jwt-key-here-make-it-long-and-complex"
azd env set JWT_ISSUER "https://saas-framework.com"
azd env set JWT_AUDIENCE "saas-framework-api"
azd env set COSMOS_DATABASE_NAME "SaaSFramework"
azd env set ASPNETCORE_ENVIRONMENT "Production"
```

### **Step 5: Deploy to Azure**
```powershell
azd up
```

---

## 🌍 **What Gets Deployed**

### **Global Infrastructure:**
- ✅ **Container Registry** - For storing your Docker images
- ✅ **Container Apps Environment** - Serverless container hosting
- ✅ **Cosmos DB** - Global multi-tenant database
- ✅ **Static Web App** - Global CDN for your frontend
- ✅ **Key Vault** - Secure secrets management
- ✅ **Application Insights** - Monitoring and logging

### **Microservices:**
- 🚪 **Gateway Service** - `https://ca-gateway-{id}.{region}.azurecontainerapps.io`
- 🔐 **Authentication Service** - Internal endpoint for auth
- 👥 **RBAC Service** - Internal endpoint for permissions  
- 📧 **Notifications Service** - Internal endpoint for messaging

### **Frontend:**
- 🌐 **Angular App** - `https://swa-sf-{id}.{region}.azurestaticapps.net`

---

## 🛠️ **After Deployment**

### **Get Service URLs:**
```powershell
azd env get-values
```

### **View Logs:**
```powershell
azd logs
```

### **Monitor in Azure:**
- Go to Azure Portal
- Search for your resource group: `rg-{environment-name}`
- Check Container Apps for service status
- Check Application Insights for monitoring

---

## 🔧 **Environment Variables You Need**

When prompted by `azd up`, provide these values:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `JWT_SECRET` | `my-super-secret-key-that-is-very-long-and-secure` | JWT signing key (keep secret!) |
| `JWT_ISSUER` | `https://saas-framework.com` | JWT issuer identifier |
| `JWT_AUDIENCE` | `saas-framework-api` | JWT audience identifier |
| `COSMOS_DATABASE_NAME` | `SaaSFramework` | Cosmos DB database name |
| `ASPNETCORE_ENVIRONMENT` | `Production` | .NET environment setting |

---

## 🎯 **Next Steps After Deployment**

1. **Test the APIs:**
   ```bash
   curl https://your-gateway-url/health
   ```

2. **Access the Frontend:**
   - Open the Static Web App URL in your browser
   - Test authentication flow

3. **Add Test Data:**
   - Use the seed scripts we created
   - Test with demo credentials

4. **Monitor Performance:**
   - Check Application Insights dashboard
   - Monitor Container Apps scaling

---

## 🆘 **Troubleshooting**

### **Common Issues:**

**Docker not running:**
```
Error: docker daemon not running
Solution: Start Docker Desktop
```

**AZD not found:**
```
Error: 'azd' is not recognized
Solution: Install Azure Developer CLI with winget
```

**Authentication errors:**
```
Error: Not authenticated
Solution: Run 'azd auth login'
```

**Deployment fails:**
```
Error: Resource already exists
Solution: Use 'azd down' to clean up, then 'azd up' again
```

---

## ✨ **Global Access URLs**

After successful deployment, your SaaS Framework will be accessible globally at:

- **🌐 Main App:** `https://swa-sf-{unique-id}.{region}.azurestaticapps.net`
- **🔗 API Gateway:** `https://ca-gateway-{unique-id}.{region}.azurecontainerapps.io`
- **📊 Monitoring:** `https://portal.azure.com` (Application Insights)

**Your modules are now ready for global external app integration! 🎉**
