using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SaaSFramework.Shared.Services;

public interface IJwtService
{
    string GenerateToken(string userId, string tenantId, string email, List<string> roles, int expiryMinutes = 60);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateToken(string token);
    bool IsTokenExpired(string token);
    string? GetClaimValue(string token, string claimType);
}

public class JwtService : IJwtService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtService(string secretKey, string issuer = "SaaSFramework", string audience = "SaaSFramework")
    {
        _secretKey = secretKey;
        _issuer = issuer;
        _audience = audience;
    }

    public string GenerateToken(string userId, string tenantId, string email, List<string> roles, int expiryMinutes = 60)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("tenantId", tenantId),
            new(ClaimTypes.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        // Add roles as claims
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_secretKey);

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            return principal;
        }
        catch
        {
            return null;
        }
    }

    public bool IsTokenExpired(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jsonToken = tokenHandler.ReadJwtToken(token);
            return jsonToken.ValidTo < DateTime.UtcNow;
        }
        catch
        {
            return true;
        }
    }

    public string? GetClaimValue(string token, string claimType)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jsonToken = tokenHandler.ReadJwtToken(token);
            return jsonToken.Claims.FirstOrDefault(c => c.Type == claimType)?.Value;
        }
        catch
        {
            return null;
        }
    }
}
