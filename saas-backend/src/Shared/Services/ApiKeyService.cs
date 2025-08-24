using System.Security.Cryptography;
using System.Text;

namespace SaaSFramework.Shared.Services;

public interface IApiKeyService
{
    string GenerateApiKey(string prefix);
    bool ValidateApiKey(string apiKey, string expectedPrefix);
    string HashApiKey(string apiKey);
    bool VerifyApiKey(string apiKey, string hashedApiKey);
}

public class ApiKeyService : IApiKeyService
{
    private const int KeyLength = 32;

    public string GenerateApiKey(string prefix)
    {
        var keyBytes = new byte[KeyLength];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(keyBytes);
        
        var keyString = Convert.ToBase64String(keyBytes)
            .Replace("+", "")
            .Replace("/", "")
            .Replace("=", "")
            .Substring(0, KeyLength);
        
        return $"{prefix}_{keyString}";
    }

    public bool ValidateApiKey(string apiKey, string expectedPrefix)
    {
        if (string.IsNullOrEmpty(apiKey))
            return false;

        var parts = apiKey.Split('_', 2);
        if (parts.Length != 2)
            return false;

        return parts[0] == expectedPrefix && parts[1].Length == KeyLength;
    }

    public string HashApiKey(string apiKey)
    {
        return BCrypt.Net.BCrypt.HashPassword(apiKey);
    }

    public bool VerifyApiKey(string apiKey, string hashedApiKey)
    {
        return BCrypt.Net.BCrypt.Verify(apiKey, hashedApiKey);
    }
}
