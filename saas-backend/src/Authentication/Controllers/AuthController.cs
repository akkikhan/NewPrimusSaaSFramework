using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using System.Security.Claims;
using System.Linq;

namespace SaaSFramework.Authentication.Controllers
{
    [ApiController]
    [Route("api/v2/[controller]")]
    [Authorize]
    public class AuthController : ControllerBase
    {
        private readonly ILogger<AuthController> _logger;

        public AuthController(ILogger<AuthController> logger)
        {
            _logger = logger;
        }

        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("User identifier not found in token.");
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        Message = "User identifier not found in token.",
                        Data = null
                    });
                }

                var userResponse = new UserResponse
                {
                    Id = userId,
                    Email = User.FindFirst("emails")?.Value ?? User.FindFirst(ClaimTypes.Email)?.Value,
                    FirstName = User.FindFirst(ClaimTypes.GivenName)?.Value,
                    LastName = User.FindFirst(ClaimTypes.Surname)?.Value,
                    Roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList(),
                    IsActive = true, // If the token is valid, the user is considered active.
                };

                _logger.LogInformation("Successfully retrieved profile for user {UserId}", userId);

                return Ok(new ApiResponse<UserResponse>
                {
                    Success = true,
                    Message = "User retrieved successfully",
                    Data = userResponse
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving current user");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    Message = "An error occurred while retrieving user information.",
                    Data = null
                });
            }
        }
    }
}