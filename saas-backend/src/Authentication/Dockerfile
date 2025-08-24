# Authentication Service Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 7011

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Authentication/SaaSFramework.Authentication.csproj", "src/Authentication/"]
COPY ["src/Shared/SaaSFramework.Shared.csproj", "src/Shared/"]
RUN dotnet restore "src/Authentication/SaaSFramework.Authentication.csproj"
COPY . .
WORKDIR "/src/src/Authentication"
RUN dotnet build "SaaSFramework.Authentication.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SaaSFramework.Authentication.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "SaaSFramework.Authentication.dll"]
