using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SaaSFramework.Shared.Models;
using SaaSFramework.Shared.Services;
using SaaSFramework.Shared.Middleware;

namespace SaaSFramework.Gateway.Controllers;

[ApiController]
[Route("api/v2/[controller]")]
[Authorize]
public class CreditsController : ControllerBase
{
    private readonly ICreditService _creditService;
    private readonly ILogger<CreditsController> _logger;

    public CreditsController(ICreditService creditService, ILogger<CreditsController> logger)
    {
        _creditService = creditService;
        _logger = logger;
    }

    [HttpGet("balance/{userId}")]
    public async Task<ActionResult<ApiResponse<CreditBalanceResponse>>> GetBalance(string userId)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<CreditBalanceResponse>.ErrorResult("Tenant context is required"));
            }

            var balance = await _creditService.GetUserCreditBalanceAsync(userId, tenantId);
            return Ok(ApiResponse<CreditBalanceResponse>.SuccessResult(balance));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting credit balance for user {UserId}", userId);
            return StatusCode(500, ApiResponse<CreditBalanceResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost("add")]
    public async Task<ActionResult<ApiResponse<CreditBalanceResponse>>> AddCredits([FromBody] AddCreditRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<CreditBalanceResponse>.ErrorResult("Tenant context is required"));
            }

            var result = await _creditService.AddCreditsAsync(tenantId, request);
            return Ok(ApiResponse<CreditBalanceResponse>.SuccessResult(result, "Credits added successfully"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding credits");
            return StatusCode(500, ApiResponse<CreditBalanceResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpPost("deduct")]
    public async Task<ActionResult<ApiResponse<CreditBalanceResponse>>> DeductCredits([FromBody] DeductCreditRequest request)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<CreditBalanceResponse>.ErrorResult("Tenant context is required"));
            }

            var result = await _creditService.DeductCreditsAsync(tenantId, request);
            return Ok(ApiResponse<CreditBalanceResponse>.SuccessResult(result, "Credits deducted successfully"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CreditBalanceResponse>.ErrorResult(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deducting credits");
            return StatusCode(500, ApiResponse<CreditBalanceResponse>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("history/{userId}")]
    public async Task<ActionResult<ApiResponse<List<CreditTransactionResponse>>>> GetHistory(
        string userId, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<List<CreditTransactionResponse>>.ErrorResult("Tenant context is required"));
            }

            var history = await _creditService.GetCreditHistoryAsync(userId, tenantId, page, pageSize);
            return Ok(ApiResponse<List<CreditTransactionResponse>>.SuccessResult(history));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting credit history for user {UserId}", userId);
            return StatusCode(500, ApiResponse<List<CreditTransactionResponse>>.ErrorResult("Internal server error"));
        }
    }

    [HttpGet("check/{userId}/{amount}")]
    public async Task<ActionResult<ApiResponse<bool>>> CheckSufficientCredits(string userId, decimal amount)
    {
        try
        {
            var tenantId = HttpContext.GetTenantId();
            if (string.IsNullOrEmpty(tenantId))
            {
                return BadRequest(ApiResponse<bool>.ErrorResult("Tenant context is required"));
            }

            var hasSufficient = await _creditService.HasSufficientCreditsAsync(userId, tenantId, amount);
            return Ok(ApiResponse<bool>.SuccessResult(hasSufficient));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking sufficient credits for user {UserId}", userId);
            return StatusCode(500, ApiResponse<bool>.ErrorResult("Internal server error"));
        }
    }
}
