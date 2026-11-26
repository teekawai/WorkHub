using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployerSlugCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) thêm cột nullable để backfill được
            migrationBuilder.AddColumn<string>(
                name: "slugCode",
                table: "employerprofile",
                type: "varchar(6)",
                maxLength: 6,
                nullable: true,
                collation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4");

            // 2) backfill: 6 ký tự [0-9a-z] ngẫu nhiên (36^6 ~ 2,2 tỷ)
            migrationBuilder.Sql("UPDATE employerprofile SET slugCode = LPAD(LOWER(CONV(FLOOR(RAND() * 2176782336), 10, 36)), 6, '0')");

            // 3) NOT NULL (không default) + unique index
            migrationBuilder.AlterColumn<string>(
                name: "slugCode",
                table: "employerprofile",
                type: "varchar(6)",
                maxLength: 6,
                nullable: false,
                collation: "utf8mb4_unicode_ci",
                oldClrType: typeof(string),
                oldType: "varchar(6)",
                oldMaxLength: 6,
                oldNullable: true,
                oldCollation: "utf8mb4_unicode_ci")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "slugCode",
                table: "employerprofile",
                column: "slugCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "slugCode",
                table: "employerprofile");

            migrationBuilder.DropColumn(
                name: "slugCode",
                table: "employerprofile");
        }
    }
}
