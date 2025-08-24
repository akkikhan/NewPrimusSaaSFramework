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
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly ICosmosDbService _cosmosDbService;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            ICosmosDbService cosmosDbService,
            ILogger<UsersController> logger)
        {
            _cosmosDbService = cosmosDbService;
            _logger = logger;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,UserManager")]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                var users = await _cosmosDbService.GetItemsAsync<User>("users", tenantId);
                
                var totalCount = users.Count();
                var pagedUsers = users
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(u => new UserResponse
                    {
                        Id = u.Id,
                        Email = u.Email,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        Roles = u.Roles,
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt,
                        LastLoginAt = u.LastLoginAt,
                        CreditBalance = u.CreditBalance
                    })
                    .ToList();

                return Ok(new ApiResponse<PagedResult<UserResponse>>
                {
                    Success = true,
                    Message = "Users retrieved successfully",
                    Data = new PagedResult<UserResponse>
                    {
                        Items = pagedUsers,
                        TotalCount = totalCount,
                        Page = page,
                        PageSize = pageSize
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving users",
                    Data = null
                });
            }
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,UserManager")]
        public async Task<IActionResult> GetUser(string id)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                var user = await _cosmosDbService.GetItemAsync<User>("users", id, tenantId);
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
                        LastLoginAt = user.LastLoginAt,
                        CreditBalance = user.CreditBalance
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user {UserId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving user",
                    Data = null
                });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,UserManager")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                // Validate request
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Email and password are required",
                        Data = null
                    });
                }

                // Check if user already exists (simplified approach)
                var allUsers = await _cosmosDbService.GetItemsAsync<User>("users", tenantId);
                var existingUsers = allUsers.Where(u => u.Email == request.Email);
                if (existingUsers.Any())
                {
                    return Conflict(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User with this email already exists",
                        Data = null
                    });
                }

                // Create new user
                var user = new User
                {
                    Id = Guid.NewGuid().ToString(),
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    TenantId = tenantId,
                    Roles = request.Roles ?? new List<string>(),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _cosmosDbService.CreateItemAsync(user, "users");

                _logger.LogInformation("User {UserId} created successfully in tenant {TenantId}", user.Id, tenantId);

                return CreatedAtAction(
                    nameof(GetUser),
                    new { id = user.Id },
                    new ApiResponse<UserResponse>
                    {
                        Success = true,
                        Message = "User created successfully",
                        Data = new UserResponse
                        {
                            Id = user.Id,
                            Email = user.Email,
                            FirstName = user.FirstName,
                            LastName = user.LastName,
                            Roles = user.Roles,
                            IsActive = user.IsActive,
                            CreatedAt = user.CreatedAt,
                            LastLoginAt = user.LastLoginAt,
                            CreditBalance = user.CreditBalance
                        }
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while creating user",
                    Data = null
                });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,UserManager")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                var user = await _cosmosDbService.GetItemAsync<User>("users", id, tenantId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                // Update user properties
                if (!string.IsNullOrEmpty(request.FirstName))
                    user.FirstName = request.FirstName;
                
                if (!string.IsNullOrEmpty(request.LastName))
                    user.LastName = request.LastName;
                
                if (request.Roles != null)
                    user.Roles = request.Roles;
                
                if (request.IsActive.HasValue)
                    user.IsActive = request.IsActive.Value;

                user.UpdatedAt = DateTime.UtcNow;

                await _cosmosDbService.UpdateItemAsync(user, "users", user.TenantId);

                _logger.LogInformation("User {UserId} updated successfully", user.Id);

                return Ok(new ApiResponse<UserResponse>
                {
                    Success = true,
                    Message = "User updated successfully",
                    Data = new UserResponse
                    {
                        Id = user.Id,
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Roles = user.Roles,
                        IsActive = user.IsActive,
                        CreatedAt = user.CreatedAt,
                        LastLoginAt = user.LastLoginAt,
                        CreditBalance = user.CreditBalance
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {UserId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while updating user",
                    Data = null
                });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                // Prevent self-deletion
                if (id == currentUserId)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Cannot delete your own account",
                        Data = null
                    });
                }

                var user = await _cosmosDbService.GetItemAsync<User>("users", id, tenantId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                await _cosmosDbService.DeleteItemAsync("users", id, tenantId);

                _logger.LogInformation("User {UserId} deleted successfully", id);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "User deleted successfully",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {UserId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while deleting user",
                    Data = null
                });
            }
        }

        [HttpPost("{id}/reset-password")]
        [Authorize(Roles = "Admin,UserManager")]
        public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                var tenantId = HttpContext.Items["TenantId"]?.ToString();
                if (string.IsNullOrEmpty(tenantId))
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "Tenant context required",
                        Data = null
                    });
                }

                if (string.IsNullOrEmpty(request.NewPassword))
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "New password is required",
                        Data = null
                    });
                }

                var user = await _cosmosDbService.GetItemAsync<User>("users", id, tenantId);
                if (user == null)
                {
                    return NotFound(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User not found",
                        Data = null
                    });
                }

                // Reset password
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                user.RefreshToken = null;
                user.RefreshTokenExpiry = null;
                user.UpdatedAt = DateTime.UtcNow;

                await _cosmosDbService.UpdateItemAsync(user, "users", user.TenantId);

                _logger.LogInformation("Password reset for user {UserId}", id);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Message = "Password reset successfully",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for user {UserId}", id);
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while resetting password",
                    Data = null
                });
            }
        }
    }

    // Request DTOs
    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public List<string>? Roles { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public List<string>? Roles { get; set; }
        public bool? IsActive { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }
}