# Gateway Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Gateway/SaaSFramework.Gateway.csproj", "src/Gateway/"]
COPY ["src/Shared/SaaSFramework.Shared.csproj", "src/Shared/"]
RUN dotnet restore "src/Gateway/SaaSFramework.Gateway.csproj"
COPY . .
WORKDIR "/src/src/Gateway"
RUN dotnet build "SaaSFramework.Gateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SaaSFramework.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaaSFramework.Gateway.dll"]
