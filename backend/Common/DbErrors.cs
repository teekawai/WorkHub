using MySqlConnector;

namespace backend.Common;

public static class DbErrors
{
    // lỗi nằm sâu trong chuỗi InnerException (InvalidOperationException "transient failure" <- DbUpdateException <- MySqlException) nên phải duyệt cả chuỗi
    public static bool IsDeadlock(Exception? ex)
    {
        for (; ex != null; ex = ex.InnerException)
            if (ex is MySqlException { ErrorCode: MySqlErrorCode.LockDeadlock }) return true;
        return false;
    }
}
