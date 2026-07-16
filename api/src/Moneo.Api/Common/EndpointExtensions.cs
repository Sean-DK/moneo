using System.Reflection;

namespace Moneo.Api.Common
{
    public static class EndpointExtensions
    {
        public static IEndpointRouteBuilder MapEndpoints(this IEndpointRouteBuilder app)
        {
            var endpointTypes = Assembly.GetExecutingAssembly()
                .GetTypes()
                .Where(t => t is { IsAbstract: false, IsInterface: false }
                    && t.IsAssignableTo(typeof(IEndpoint)));

            foreach (var type in endpointTypes)
            {
                var map = type.GetMethod(
                    nameof(IEndpoint.Map),
                    BindingFlags.Static | BindingFlags.Public,
                    [typeof(IEndpointRouteBuilder)]);

                map!.Invoke(null, [app]);
            }

            return app;
        }
    }
}
