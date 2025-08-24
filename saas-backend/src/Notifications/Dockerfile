# Notifications Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 7015

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Notifications/SaaSFramework.Notifications.csproj", "src/Notifications/"]
COPY ["src/Shared/SaaSFramework.Shared.csproj", "src/Shared/"]
RUN dotnet restore "src/Notifications/SaaSFramework.Notifications.csproj"
COPY . .
WORKDIR "/src/src/Notifications"
RUN dotnet build "SaaSFramework.Notifications.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SaaSFramework.Notifications.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaaSFramework.Notifications.dll"]
