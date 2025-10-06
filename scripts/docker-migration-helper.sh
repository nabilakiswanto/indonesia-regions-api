#!/bin/bash

# Docker Migration Helper Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Indonesia Regions Docker Migration Helper${NC}"
echo "=================================================="

# Function to run migration with specific settings
run_migration() {
    local migration_type=$1
    local description=$2
    local extra_env=$3
    
    echo -e "\n${YELLOW}Starting: $description${NC}"
    echo "Type: $migration_type"
    
    # Set environment and run migration
    if [ -n "$extra_env" ]; then
        env $extra_env docker compose -f docker/docker-compose.dev.yml --env-file .env --profile migration up migrator --build
    else
        docker compose -f docker/docker-compose.dev.yml --env-file .env --profile migration up migrator --build
    fi
    
    echo -e "${GREEN}✅ Completed: $description${NC}"
}

# Check if services are running
check_services() {
    echo -e "\n${BLUE}Checking required services...${NC}"
    
    if ! docker compose -f docker/docker-compose.dev.yml --env-file .env ps postgres | grep -q "healthy"; then
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        docker compose -f docker/docker-compose.dev.yml --env-file .env up -d postgres
        
        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        timeout=60
        while [ $timeout -gt 0 ] && ! docker compose -f docker/docker-compose.dev.yml --env-file .env exec postgres pg_isready -U postgres -d indonesia_regions_dev >/dev/null 2>&1; do
            echo -n "."
            sleep 2
            timeout=$((timeout-2))
        done
        
        if [ $timeout -le 0 ]; then
            echo -e "\n${RED}❌ PostgreSQL failed to start within 60 seconds${NC}"
            exit 1
        fi
        
        echo -e "\n${GREEN}✅ PostgreSQL is ready${NC}"
    else
        echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
    fi
}

# Migration options menu
show_menu() {
    echo -e "\n${BLUE}Choose migration option:${NC}"
    echo "1) Full migration (all levels including villages) - Takes 2-4 hours"
    echo "2) No villages (provinces, regencies, districts only) - Takes 30-60 minutes"
    echo "3) Sample migration (limited villages) - Takes 15-30 minutes"
    echo "4) Provinces only - Takes 2-5 minutes"
    echo "5) Check migration status"
    echo "6) View migration logs"
    echo "7) Reset database (clear all data)"
    echo "8) Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
}

# Main execution
main() {
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env file not found${NC}"
        echo "Please create .env file first"
        exit 1
    fi
    
    # Create required directories
    mkdir -p logs data
    
    while true; do
        show_menu
        
        case $choice in
            1)
                check_services
                run_migration "full" "Full Migration (All Levels)" ""
                ;;
            2)
                check_services
                run_migration "no-villages" "Migration without Villages" "INCLUDE_VILLAGES=false"
                ;;
            3)
                check_services
                run_migration "sample" "Sample Migration (Limited Villages)" "VILLAGE_LIMIT=1000"
                ;;
            4)
                check_services
                run_migration "provinces-only" "Provinces Only Migration" "INCLUDE_VILLAGES=false VILLAGE_LIMIT=0"
                ;;
            5)
                echo -e "\n${BLUE}Migration Status:${NC}"
                docker compose -f docker/docker-compose.dev.yml --env-file .env exec -T postgres psql -U postgres -d indonesia_regions_dev -c "
                SELECT 
                    CASE level 
                        WHEN 1 THEN 'Provinces' 
                        WHEN 2 THEN 'Regencies' 
                        WHEN 3 THEN 'Districts' 
                        WHEN 4 THEN 'Villages' 
                    END as level_name,
                    COUNT(*) as count,
                    MIN(created_at) as first_created,
                    MAX(updated_at) as last_updated
                FROM regions 
                GROUP BY level 
                ORDER BY level;
                " 2>/dev/null || echo "Database not accessible"
                ;;
            6)
                echo -e "\n${BLUE}Recent Migration Logs:${NC}"
                if [ -d "logs" ]; then
                    find logs -name "migration-*.log" -type f -exec ls -lt {} + | head -5 | while read line; do
                        file=$(echo $line | awk '{print $NF}')
                        echo -e "${YELLOW}$file:${NC}"
                        tail -10 "$file" 2>/dev/null || echo "Cannot read log file"
                        echo ""
                    done
                else
                    echo "No log files found"
                fi
                ;;
            7)
                echo -e "\n${YELLOW}⚠️  This will delete ALL region data!${NC}"
                read -p "Are you sure? (type 'yes' to confirm): " confirm
                if [ "$confirm" = "yes" ]; then
                    docker compose -f docker/docker-compose.dev.yml --env-file .env exec -T postgres psql -U postgres -d indonesia_regions_dev -c "TRUNCATE TABLE regions RESTART IDENTITY CASCADE; TRUNCATE TABLE migration_stats RESTART IDENTITY CASCADE;" 2>/dev/null
                    echo -e "${GREEN}✅ Database cleared${NC}"
                else
                    echo "Operation cancelled"
                fi
                ;;
            8)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option${NC}"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
