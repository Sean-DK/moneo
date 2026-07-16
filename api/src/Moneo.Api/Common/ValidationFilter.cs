using FluentValidation;

namespace Moneo.Api.Common
{
    public class ValidationFilter<TRequest>(IValidator<TRequest> validator) : IEndpointFilter
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var request = context.Arguments.OfType<TRequest>().FirstOrDefault();

            if (request == null)
                return Results.Problem("Request body is missing.", statusCode: 400);

            var result = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);

            if (!result.IsValid)
                return Results.ValidationProblem(result.ToDictionary());

            return await next(context);
        }
    }

    public static class ValidationExtensions
    {
        public static RouteHandlerBuilder WithRequestValidation<TRequest>(this RouteHandlerBuilder builder) =>
            builder.AddEndpointFilter<ValidationFilter<TRequest>>()
                .ProducesValidationProblem();
    }
}
