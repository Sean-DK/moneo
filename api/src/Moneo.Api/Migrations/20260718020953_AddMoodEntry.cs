using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Moneo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMoodEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MoodEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MoodDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DayRating = table.Column<int>(type: "int", nullable: true),
                    Productivity = table.Column<int>(type: "int", nullable: true),
                    Weather = table.Column<int>(type: "int", nullable: true),
                    Activities = table.Column<int>(type: "int", nullable: true),
                    ActivitiesChaotic = table.Column<bool>(type: "bit", nullable: true),
                    Location = table.Column<int>(type: "int", nullable: true),
                    FreeTime = table.Column<int>(type: "int", nullable: true),
                    Social = table.Column<int>(type: "int", nullable: true),
                    Sleep = table.Column<int>(type: "int", nullable: true),
                    AteWell = table.Column<int>(type: "int", nullable: true),
                    Exercise = table.Column<int>(type: "int", nullable: true),
                    Sickness = table.Column<int>(type: "int", nullable: true),
                    StressEvent = table.Column<int>(type: "int", nullable: true),
                    GoodEvent = table.Column<int>(type: "int", nullable: true),
                    Outlook = table.Column<int>(type: "int", nullable: true),
                    Laughed = table.Column<bool>(type: "bit", nullable: true),
                    RepeatDay = table.Column<bool>(type: "bit", nullable: true),
                    RepeatDayAutoSkipped = table.Column<bool>(type: "bit", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ModifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MoodEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MoodEntries_UserId_MoodDate",
                table: "MoodEntries",
                columns: new[] { "UserId", "MoodDate" },
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_MoodEntries_UserId_RowVersion",
                table: "MoodEntries",
                columns: new[] { "UserId", "RowVersion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MoodEntries");
        }
    }
}
