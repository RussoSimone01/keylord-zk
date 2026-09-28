using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <summary>
    /// Data-only migration: permanent lockouts no longer exist, existing ones (stored as DateTime.MaxValue) become 24-hour locks.
    /// </summary>
    public partial class CapPermanentLockouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
				UPDATE "Users"
				SET "LockedUntil" = NOW() + INTERVAL '1 day',
					"UpdatedAt" = NOW()
				WHERE "LockedUntil" > NOW() + INTERVAL '1 day';
				""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Irreversible: the original lock expiry is not preserved
        }
    }
}
