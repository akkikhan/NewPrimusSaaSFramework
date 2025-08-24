using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;
using System.Security.Claims;
using BCrypt.Net;

namespace SaaSFramework.Authentication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ICosmosDbService _cosmosDbService;
        private readonly IJwtService _jwtService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            ICosmosDbService cosmosDbService,
            IJwtService jwtService,
            ILogger<AuthController> logger)
        {
            _cosmosDbService = cosmosDbService;
            _jwtService = jwtService;
            _logger = logger;
        }

                [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Email and password are required",
                        Data = null
                    });
                }

                // Get tenant ID from header
                var tenantId = HttpContext.GetTenantId();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context is required",
                        Data = null
                    });
                }

                // Get user by email in the tenant
                var users = await _cosmosDbService.GetItemsAsync<User>(
                    "users", 
                    tenantId, 
                    u => u.Email == request.Email
                );

                var user = users.FirstOrDefault();
                if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid email or password",
                        Data = null
                    });
                }

                if (!user.IsActive)
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Account is disabled",
                        Data = null
                    });
                }

                // Generate JWT token
                var token = _jwtService.GenerateToken(user.Id, user.Email, user.TenantId, user.Roles);
                var refreshToken = _jwtService.GenerateRefreshToken();
                var expiresAt = DateTime.UtcNow.AddMinutes(60);

                // Update user last login
                user.LastLogin = DateTime.UtcNow;
                user.LastLoginAt = DateTime.UtcNow;
                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
                await _cosmosDbService.UpdateItemAsync(user, "users", tenantId);

                var response = new LoginResponse
                {
                    Token = token,
                    User = new UserResponse
                    {
                        Id = user.Id,
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        IsActive = user.IsActive,
                        Roles = user.Roles,
                        CreatedAt = user.CreatedAt,
                        LastLogin = user.LastLogin,
                        LastLoginAt = user.LastLoginAt,
                        CreditBalance = user.CreditBalance
                    },
                    ExpiresAt = expiresAt,
                    RefreshToken = refreshToken
                };

                return Ok(new ApiResponse<LoginResponse>
                {
                    Success = true,
                    Message = "Login successful",
                    Data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "Internal server error",
                    Data = null
                });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.RefreshToken))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Refresh token is required",
                        Data = null
                    });
                }

                // TODO: Fix refresh token lookup - needs proper indexing
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Refresh token temporarily disabled - needs proper indexing implementation",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred during token refresh",
                    Data = null
                });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tenantId = HttpContext.Items["TenantId"]?.ToString();

                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid token",
                        Data = null
                    });
                }

                // Get user and clear refresh token
                var user = await _cosmosDbService.GetItemAsync<User>("users", userId, tenantId);
                if (user != null)
                {
                    user.RefreshToken = null;
                    user.RefreshTokenExpiry = null;
                    user.UpdatedAt = DateTime.UtcNow;

                    await _cosmosDbService.UpdateItemAsync(user, "users", user.TenantId);
                }

                _logger.LogInformation("User {UserId} logged out successfully", userId);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Logout successful",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred during logout",
                    Data = null
                });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tenantId = HttpContext.Items["TenantId"]?.ToString();

                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid token",
                        Data = null
                    });
                }

                if (string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Current password and new password are required",
                        Data = null
                    });
                }

                // Get user
                var user = await _cosmosDbService.GetItemAsync<User>("users", userId, tenantId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                // Verify current password
                if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Current password is incorrect",
                        Data = null
                    });
                }

                // Update password
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                user.UpdatedAt = DateTime.UtcNow;

                await _cosmosDbService.UpdateItemAsync(user, "users", user.TenantId);

                _logger.LogInformation("User {UserId} changed password successfully", userId);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Password changed successfully",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred during password change",
                    Data = null
                });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tenantId = HttpContext.Items["TenantId"]?.ToString();

                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Invalid token",
                        Data = null
                    });
                }

                var user = await _cosmosDbService.GetItemAsync<User>("users", userId, tenantId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                return Ok(new ApiResponse<UserResponse>
                {
                    Success = true,
                    Message = "User retrieved successfully",
                    Data = new UserResponse
                    {
                        Id = user.Id,
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Roles = user.Roles,
                        IsActive = user.IsActive,
                        CreatedAt = user.CreatedAt,
                        LastLoginAt = user.LastLoginAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving current user");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving user",
                    Data = null
                });
            }
        }
    }
}