#!/bin/bash

# Super Lookup LWC Deployment Script
# This script helps deploy the Flow Lookup component to your Salesforce org

echo "🚀 Super Lookup LWC Deployment Script"
echo "======================================"

# Check if SFDX CLI is installed
if ! command -v sfdx &> /dev/null; then
    echo "❌ Error: Salesforce CLI is not installed or not in PATH"
    echo "Please install SFDX CLI: https://developer.salesforce.com/tools/sfdxcli"
    exit 1
fi

echo "✅ Salesforce CLI found"

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "📁 Project directory: $SCRIPT_DIR"

# Check if we're in the right directory
if [ ! -f "sfdx-project.json" ]; then
    echo "❌ Error: Not in a valid SFDX project directory"
    echo "Please run this script from the superLookupLWC project root"
    exit 1
fi

# List available orgs
echo ""
echo "📋 Available orgs:"
sfdx org:list

echo ""
read -p "🎯 Enter the alias or username of your target org: " TARGET_ORG

if [ -z "$TARGET_ORG" ]; then
    echo "❌ Error: No org specified"
    exit 1
fi

# Validate org connection
echo "🔍 Validating org connection..."
if ! sfdx org:display -u "$TARGET_ORG" &> /dev/null; then
    echo "❌ Error: Cannot connect to org '$TARGET_ORG'"
    echo "Please check the org alias/username and ensure you're authenticated"
    exit 1
fi

echo "✅ Successfully connected to org: $TARGET_ORG"

# Deploy components
echo ""
echo "🚀 Deploying Super Lookup LWC components..."
echo "This includes:"
echo "  - FlowLookupController (Apex Class)"
echo "  - FlowLookupControllerTest (Test Class)"
echo "  - flowLookup (Lightning Web Component)"
echo "  - flowLookupPropertyEditor (Property Editor Component)"

# Start deployment
if sfdx project:deploy:start -u "$TARGET_ORG"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Super Lookup LWC has been deployed to your org!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to Flow Builder in your Salesforce org"
    echo "2. Create a new Screen Flow or edit an existing one"
    echo "3. Add a new Screen element"
    echo "4. Look for 'Flow Lookup' in the component palette"
    echo "5. Drag it onto your screen and configure using the property editor"
    echo ""
    echo "🔧 Configuration options:"
    echo "  - Select object and primary field"
    echo "  - Choose secondary/tertiary fields using dual-listbox"
    echo "  - Enable single or multiple selection"
    echo "  - Set placeholder text and record limits"
    echo "  - Add custom WHERE clause conditions"
    echo ""
    echo "📖 For detailed instructions, see the README.md file"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "1. Check that you have sufficient permissions in the target org"
    echo "2. Verify that the org allows Lightning Web Components"
    echo "3. Review any error messages above"
    echo "4. Try deploying individual components:"
    echo "   sfdx project:deploy:start -m ApexClass -u $TARGET_ORG"
    echo "   sfdx project:deploy:start -m LightningComponentBundle -u $TARGET_ORG"
    echo ""
    echo "📞 Need help? Check the deployment logs:"
    echo "   sfdx project:deploy:report -u $TARGET_ORG"
    exit 1
fi

# Run tests (optional)
echo ""
read -p "🧪 Would you like to run the test classes? (y/n): " RUN_TESTS

if [[ $RUN_TESTS =~ ^[Yy]$ ]]; then
    echo "🧪 Running test classes..."
    if sfdx apex:test:run -c -r human -u "$TARGET_ORG" -t FlowLookupControllerTest; then
        echo "✅ All tests passed!"
    else
        echo "⚠️  Some tests may have failed. Check the test results above."
    fi
fi

echo ""
echo "🎊 Setup complete! Happy Flow building!"
