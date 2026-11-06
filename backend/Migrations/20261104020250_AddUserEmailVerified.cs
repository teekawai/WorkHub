using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEmailVerified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "emailVerified",
                table: "users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            //user tạo qua Google (không có mật khẩu) đã được Google xác minh email từ trước
            migrationBuilder.Sql("UPDATE users SET emailVerified = 1 WHERE passwordHash IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "emailVerified",
                table: "users");
        }
    }
}
