namespace Moneo.Api.Common
{
    public interface ICurrentUserAccessor
    {
        Task<CurrentUser> GetAsync(CancellationToken ct);
    }
}
