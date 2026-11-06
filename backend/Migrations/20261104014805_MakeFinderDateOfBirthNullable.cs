using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class MakeFinderDateOfBirthNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "dateOfBirth",
                table: "finderprofile",
                type: "datetime(6)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)",
                oldMaxLength: 255);

            //dữ liệu cũ bị ghi 0001-01-01 do FE gửi sai tên field (birthday) -> coi như chưa nhập
            migrationBuilder.Sql("UPDATE finderprofile SET dateOfBirth = NULL WHERE dateOfBirth < '1900-01-01';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "dateOfBirth",
                table: "finderprofile",
                type: "datetime(6)",
                maxLength: 255,
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)",
                oldMaxLength: 255,
                oldNullable: true);
        }
    }
}
