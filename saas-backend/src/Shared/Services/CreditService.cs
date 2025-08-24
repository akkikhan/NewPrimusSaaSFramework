using SaaSFramework.Shared.Models;
using Microsoft.Extensions.Logging;

namespace SaaSFramework.Shared.Services;

public interface ICreditService
{
    Task<CreditBalanceResponse> GetUserCreditBalanceAsync(string userId, string tenantId);
    Task<CreditBalanceResponse> AddCreditsAsync(string tenantId, AddCreditRequest request);
    Task<CreditBalanceResponse> DeductCreditsAsync(string tenantId, DeductCreditRequest request);
    Task<List<CreditTransactionResponse>> GetCreditHistoryAsync(string userId, string tenantId, int page = 1, int pageSize = 20);
    Task<bool> HasSufficientCreditsAsync(string userId, string tenantId, decimal amount);
}

public class CreditService : ICreditService
{
    private readonly ICosmosDbService _cosmosDbService;
    private readonly ILogger<CreditService> _logger;
    private const string ContainerName = "credits";

    public CreditService(ICosmosDbService cosmosDbService, ILogger<CreditService> logger)
    {
        _cosmosDbService = cosmosDbService;
        _logger = logger;
    }

    public async Task<CreditBalanceResponse> GetUserCreditBalanceAsync(string userId, string tenantId)
    {
        try
        {
            var balance = await _cosmosDbService.GetItemsAsync<CreditBalance>(
                ContainerName, 
                tenantId, 
                cb => cb.UserId == userId
            );

            var userBalance = balance.FirstOrDefault();
            if (userBalance == null)
            {
                // Create initial balance record
                userBalance = new CreditBalance
                {
                    TenantId = tenantId,
                    UserId = userId,
                    Balance = 0
                };
                await _cosmosDbService.CreateItemAsync(userBalance, ContainerName);
            }

            return new CreditBalanceResponse
            {
                UserId = userId,
                Balance = userBalance.Balance,
                LastUpdated = userBalance.LastUpdated
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting credit balance for user {UserId} in tenant {TenantId}", userId, tenantId);
            throw;
        }
    }

    public async Task<CreditBalanceResponse> AddCreditsAsync(string tenantId, AddCreditRequest request)
    {
        try
        {
            var currentBalance = await GetUserCreditBalanceAsync(request.UserId, tenantId);
            var newBalance = currentBalance.Balance + request.Amount;

            // Create credit record
            var credit = new Credit
            {
                TenantId = tenantId,
                UserId = request.UserId,
                Amount = request.Amount,
                Type = request.Type,
                Description = request.Description,
                ReferenceId = request.ReferenceId,
                ExpiresAt = request.ExpiresAt
            };

            await _cosmosDbService.CreateItemAsync(credit, ContainerName);

            // Create transaction record
            var transaction = new CreditTransaction
            {
                TenantId = tenantId,
                UserId = request.UserId,
                Amount = request.Amount,
                Type = request.Type,
                Description = request.Description,
                ReferenceId = request.ReferenceId,
                BalanceBefore = currentBalance.Balance,
                BalanceAfter = newBalance
            };

            await _cosmosDbService.CreateItemAsync(transaction, ContainerName);

            // Update balance
            await UpdateUserBalanceAsync(request.UserId, tenantId, newBalance);

            _logger.LogInformation("Added {Amount} credits to user {UserId} in tenant {TenantId}", 
                request.Amount, request.UserId, tenantId);

            return new CreditBalanceResponse
            {
                UserId = request.UserId,
                Balance = newBalance,
                LastUpdated = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding credits for user {UserId} in tenant {TenantId}", 
                request.UserId, tenantId);
            throw;
        }
    }

    public async Task<CreditBalanceResponse> DeductCreditsAsync(string tenantId, DeductCreditRequest request)
    {
        try
        {
            var currentBalance = await GetUserCreditBalanceAsync(request.UserId, tenantId);
            
            if (currentBalance.Balance < request.Amount)
            {
                throw new InvalidOperationException("Insufficient credits");
            }

            var newBalance = currentBalance.Balance - request.Amount;

            // Create transaction record
            var transaction = new CreditTransaction
            {
                TenantId = tenantId,
                UserId = request.UserId,
                Amount = request.Amount,
                Type = CreditType.Spent,
                Description = request.Description,
                ReferenceId = request.ReferenceId,
                BalanceBefore = currentBalance.Balance,
                BalanceAfter = newBalance
            };

            await _cosmosDbService.CreateItemAsync(transaction, ContainerName);

            // Update balance
            await UpdateUserBalanceAsync(request.UserId, tenantId, newBalance);

            _logger.LogInformation("Deducted {Amount} credits from user {UserId} in tenant {TenantId}", 
                request.Amount, request.UserId, tenantId);

            return new CreditBalanceResponse
            {
                UserId = request.UserId,
                Balance = newBalance,
                LastUpdated = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deducting credits for user {UserId} in tenant {TenantId}", 
                request.UserId, tenantId);
            throw;
        }
    }

    public async Task<List<CreditTransactionResponse>> GetCreditHistoryAsync(string userId, string tenantId, int page = 1, int pageSize = 20)
    {
        try
        {
            var transactions = await _cosmosDbService.GetItemsAsync<CreditTransaction>(
                ContainerName, 
                tenantId, 
                ct => ct.UserId == userId
            );

            var sortedTransactions = transactions
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new CreditTransactionResponse
                {
                    Id = t.Id,
                    UserId = t.UserId,
                    Amount = t.Amount,
                    Type = t.Type,
                    Description = t.Description,
                    ReferenceId = t.ReferenceId,
                    BalanceBefore = t.BalanceBefore,
                    BalanceAfter = t.BalanceAfter,
                    CreatedAt = t.CreatedAt
                })
                .ToList();

            return sortedTransactions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting credit history for user {UserId} in tenant {TenantId}", userId, tenantId);
            throw;
        }
    }

    public async Task<bool> HasSufficientCreditsAsync(string userId, string tenantId, decimal amount)
    {
        try
        {
            var balance = await GetUserCreditBalanceAsync(userId, tenantId);
            return balance.Balance >= amount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking sufficient credits for user {UserId} in tenant {TenantId}", userId, tenantId);
            throw;
        }
    }

    private async Task UpdateUserBalanceAsync(string userId, string tenantId, decimal newBalance)
    {
        var balanceRecords = await _cosmosDbService.GetItemsAsync<CreditBalance>(
            ContainerName, 
            tenantId, 
            cb => cb.UserId == userId
        );

        var balanceRecord = balanceRecords.FirstOrDefault();
        if (balanceRecord != null)
        {
            balanceRecord.Balance = newBalance;
            balanceRecord.LastUpdated = DateTime.UtcNow;
            await _cosmosDbService.UpdateItemAsync(balanceRecord, ContainerName, tenantId);
        }

        // Also update user record
        var users = await _cosmosDbService.GetItemsAsync<User>(
            "users", 
            tenantId, 
            u => u.Id == userId
        );

        var user = users.FirstOrDefault();
        if (user != null)
        {
            user.CreditBalance = newBalance;
            await _cosmosDbService.UpdateItemAsync(user, "users", tenantId);
        }
    }
}
