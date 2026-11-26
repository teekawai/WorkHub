using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddJobUpdatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) thêm cột nullable (không default) để backfill được
            migrationBuilder.AddColumn<DateTime>(
                name: "updatedAt",
                table: "job",
                type: "datetime",
                nullable: true);

            // 2) Job cũ: updatedAt = createdAt (Business 5.1)
            migrationBuilder.Sql("UPDATE job SET updatedAt = createdAt");

            // 3) NOT NULL, không default (quên gán lúc tạo sẽ lỗi thay vì ra 0001-01-01)
            migrationBuilder.AlterColumn<DateTime>(
                name: "updatedAt",
                table: "job",
                type: "datetime",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "updatedAt",
                table: "job");
        }
    }
}
