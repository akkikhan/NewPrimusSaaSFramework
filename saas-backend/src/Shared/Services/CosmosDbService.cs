using Microsoft.Azure.Cosmos;
using SaaSFramework.Shared.Models;
using System.Linq.Expressions;

namespace SaaSFramework.Shared.Services;

public interface ICosmosDbService
{
    Task<T?> GetItemAsync<T>(string id, string partitionKey, string containerName) where T : class;
    Task<List<T>> GetItemsAsync<T>(string containerName, string partitionKey, Expression<Func<T, bool>>? filter = null) where T : class;
    Task<PagedResult<T>> GetPagedItemsAsync<T>(string containerName, string partitionKey, int page, int pageSize, Expression<Func<T, bool>>? filter = null) where T : class;
    Task<T> CreateItemAsync<T>(T item, string containerName) where T : class;
    Task<T> UpdateItemAsync<T>(T item, string containerName, string partitionKey) where T : class;
    Task DeleteItemAsync(string id, string partitionKey, string containerName);
    Task<bool> ItemExistsAsync<T>(string id, string partitionKey, string containerName) where T : class;
}

public class CosmosDbService : ICosmosDbService
{
    private readonly CosmosClient _cosmosClient;
    private readonly Database _database;
    private readonly string _databaseName = "SaaSFrameworkDB";

    public CosmosDbService(CosmosClient cosmosClient)
    {
        _cosmosClient = cosmosClient;
        _database = _cosmosClient.GetDatabase(_databaseName);
    }

    public async Task<T?> GetItemAsync<T>(string id, string partitionKey, string containerName) where T : class
    {
        try
        {
            var container = _database.GetContainer(containerName);
            var response = await container.ReadItemAsync<T>(id, new PartitionKey(partitionKey));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<List<T>> GetItemsAsync<T>(string containerName, string partitionKey, Expression<Func<T, bool>>? filter = null) where T : class
    {
        var container = _database.GetContainer(containerName);
        
        var queryDefinition = new QueryDefinition("SELECT * FROM c");
        
        if (filter != null)
        {
            // For now, just get all items and filter in memory for simplicity
            // In production, you'd want to convert the expression to SQL
        }

        var query = container.GetItemQueryIterator<T>(
            queryDefinition,
            requestOptions: new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(partitionKey)
            });

        var results = new List<T>();
        while (query.HasMoreResults)
        {
            var response = await query.ReadNextAsync();
            results.AddRange(response);
        }

        // Apply filter in memory if provided
        if (filter != null)
        {
            var compiledFilter = filter.Compile();
            results = results.Where(compiledFilter).ToList();
        }

        return results;
    }

    public async Task<PagedResult<T>> GetPagedItemsAsync<T>(string containerName, string partitionKey, int page, int pageSize, Expression<Func<T, bool>>? filter = null) where T : class
    {
        var container = _database.GetContainer(containerName);
        
        // First, get a quick count to see if there are any items
        var countQuery = new QueryDefinition("SELECT VALUE COUNT(1) FROM c");
        var countIterator = container.GetItemQueryIterator<int>(
            countQuery,
            requestOptions: new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(partitionKey)
            });

        var totalCount = 0;
        while (countIterator.HasMoreResults)
        {
            var response = await countIterator.ReadNextAsync();
            totalCount = response.FirstOrDefault();
            break;
        }

        // If no items, return empty result immediately
        if (totalCount == 0)
        {
            return new PagedResult<T>
            {
                Items = new List<T>(),
                TotalCount = 0,
                Page = page,
                PageSize = pageSize
            };
        }

        // If we have items, use a simple approach for now
        var offset = (page - 1) * pageSize;
        var queryDefinition = new QueryDefinition("SELECT * FROM c");
        
        var query = container.GetItemQueryIterator<T>(
            queryDefinition,
            requestOptions: new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(partitionKey),
                MaxItemCount = Math.Min(pageSize * 2, 100) // Limit to reasonable size
            });

        var allItems = new List<T>();
        while (query.HasMoreResults && allItems.Count < (offset + pageSize))
        {
            var response = await query.ReadNextAsync();
            allItems.AddRange(response);
        }

        // Apply filter in memory if provided
        if (filter != null)
        {
            var compiledFilter = filter.Compile();
            allItems = allItems.Where(compiledFilter).ToList();
        }

        var items = allItems.Skip(offset).Take(pageSize).ToList();

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<T> CreateItemAsync<T>(T item, string containerName) where T : class
    {
        var container = _database.GetContainer(containerName);
        var response = await container.CreateItemAsync(item);
        return response.Resource;
    }

    public async Task<T> UpdateItemAsync<T>(T item, string containerName, string partitionKey) where T : class
    {
        var container = _database.GetContainer(containerName);
        var response = await container.ReplaceItemAsync(item, GetItemId(item), new PartitionKey(partitionKey));
        return response.Resource;
    }

    public async Task DeleteItemAsync(string id, string partitionKey, string containerName)
    {
        var container = _database.GetContainer(containerName);
        await container.DeleteItemAsync<object>(id, new PartitionKey(partitionKey));
    }

    public async Task<bool> ItemExistsAsync<T>(string id, string partitionKey, string containerName) where T : class
    {
        var item = await GetItemAsync<T>(id, partitionKey, containerName);
        return item != null;
    }

    private static string GetItemId<T>(T item) where T : class
    {
        var idProperty = typeof(T).GetProperty("Id");
        if (idProperty?.GetValue(item) is string id)
        {
            return id;
        }
        
        // Fallback to looking for id property (lowercase)
        var idPropertyLower = typeof(T).GetProperty("id");
        if (idPropertyLower?.GetValue(item) is string idLower)
        {
            return idLower;
        }
        
        throw new InvalidOperationException($"No Id property found on type {typeof(T).Name}");
    }
}
