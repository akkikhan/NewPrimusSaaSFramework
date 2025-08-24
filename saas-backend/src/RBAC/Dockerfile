# RBAC Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 7002

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/RBAC/SaaSFramework.RBAC.csproj", "src/RBAC/"]
COPY ["src/Shared/SaaSFramework.Shared.csproj", "src/Shared/"]
RUN dotnet restore "src/RBAC/SaaSFramework.RBAC.csproj"
COPY . .
WORKDIR "/src/src/RBAC"
RUN dotnet build "SaaSFramework.RBAC.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SaaSFramework.RBAC.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaaSFramework.RBAC.dll"]
