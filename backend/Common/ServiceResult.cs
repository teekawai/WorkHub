using System;
using System.Collections.Generic;
using backend.Models;
namespace backend.Common;

public enum ErrorCode
{
    Success,
    NotFound,
    BadRequest,
    Conflict,
    Unauthorized,
    ServiceUnavailable,
    Forbidden,
    TooManyRequests
}

//  dùng chung cho toàn bộ Service layer, thay cho Result/ResultStatus/RefreshTokenValidateResult riêng lẻ trước đây
public class ServiceResult<T>
{
    public ErrorCode Code { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }

    // mã lỗi chuỗi cụ thể (vd JOB_NOT_FOUND); null thì ToActionResult dùng mã mặc định theo ErrorCode
    public string? Key { get; set; }

    // lỗi theo field (key camelCase do Service tự đặt)
    public IDictionary<string, string[]>? Errors { get; set; }

    public bool IsSuccess => Code == ErrorCode.Success;

    public static ServiceResult<T> Success(T data, string? message = null) => new()
    {
        Code = ErrorCode.Success,
        Message = message,
        Data = data
    };

    public static ServiceResult<T> Fail(ErrorCode code, string message, string? key = null) => new()
    {
        Code = code,
        Message = message,
        Key = key
    };

    public static ServiceResult<T> ValidationFail(IDictionary<string, string[]> errors, string message = "Dữ liệu không hợp lệ") => new()
    {
        Code = ErrorCode.BadRequest,
        Message = message,
        Key = ApiErrorCodes.ValidationError,
        Errors = errors
    };
}
