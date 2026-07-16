namespace Moneo.Api.Common
{
    public record CurrentUser(Guid Id, string Email, string DisplayName)
    {
        public static async ValueTask<CurrentUser> BindAsync(HttpContext context)
        {
            var accessor = context.RequestServices.GetRequiredService<ICurrentUserAccessor>();

            return await accessor.GetAsync(context.RequestAborted);
        }
    }
}
