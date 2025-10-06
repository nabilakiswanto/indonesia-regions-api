PROJECT_DIR=$(pwd)

# Create cron job for daily sync (provinces and regencies only)
DAILY_JOB="0 2 * * * cd $PROJECT_DIR && npm run cron:daily-sync >> logs/cron-daily.log 2>&1"

# Create cron job for weekly full sync (including districts and villages)
WEEKLY_JOB="0 3 * * 0 cd $PROJECT_DIR && npm run cron:weekly-full-sync >> logs/cron-weekly.log 2>&1"

echo "Setting up cron jobs for automatic syncing..."

# Add to crontab
(crontab -l 2>/dev/null; echo "$DAILY_JOB") | crontab -
(crontab -l 2>/dev/null; echo "$WEEKLY_JOB") | crontab -

echo "✅ Cron jobs added:"
echo "   Daily sync: Every day at 2:00 AM"
echo "   Weekly full sync: Every Sunday at 3:00 AM"

crontab -l
