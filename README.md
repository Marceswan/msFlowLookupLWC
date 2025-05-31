# MS Flow Lookup Lightning Web Component

A powerful and flexible lookup component designed specifically for Salesforce Flows. This component provides an enhanced lookup experience with support for single and multiple record selection, customizable display formats, and dynamic field configuration.

## Features

- 🔍 **Dynamic Object Selection**: Search any accessible Salesforce object
- 🎯 **Flexible Field Configuration**: Configure primary, secondary, and tertiary display fields
- ✅ **Multiple Selection Support**: Toggle between single and multiple record selection
- 📊 **Display Formats**: Choose between pills or datatable for selected records
- 🎨 **Custom Property Editor**: User-friendly configuration interface in Flow Builder
- 🎭 **Icon Support**: Automatic icon resolution for standard and custom objects
- ⚡ **Performance Optimized**: Debounced search with configurable limits
- 🛡️ **Error Handling**: Comprehensive error messages for configuration issues

## Installation

1. Deploy the component to your Salesforce org using Salesforce CLI:
   ```bash
   sf project deploy start --source-path force-app
   ```
   
   Or using the older sfdx command:
   ```bash
   sfdx project:deploy:start
   ```

2. Assign the necessary permissions to users who will create/edit flows

## Component Structure

```
force-app/main/default/
├── lwc/
│   ├── msFlowLookupLWC/                    # Main lookup component
│   │   ├── msFlowLookupLWC.js
│   │   ├── msFlowLookupLWC.html
│   │   ├── msFlowLookupLWC.css
│   │   └── msFlowLookupLWC.js-meta.xml
│   └── msFlowLookupPropertyEditor/         # Custom property editor
│       ├── msFlowLookupPropertyEditor.js
│       ├── msFlowLookupPropertyEditor.html
│       ├── msFlowLookupPropertyEditor.css
│       └── msFlowLookupPropertyEditor.js-meta.xml
└── classes/
    ├── MsFlowLookupController.cls          # Apex backend controller
    ├── MsFlowLookupController.cls-meta.xml
    ├── MsFlowLookupControllerTest.cls      # Test class
    └── MsFlowLookupControllerTest.cls-meta.xml
```

## Usage in Flows

### Adding to a Screen Flow

1. In Flow Builder, add a Screen element
2. Drag the \"MS Flow Lookup\" component onto the screen
3. Configure the component using the property editor

### Configuration Options

#### Input Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| **Object API Name** | String | The API name of the Salesforce object to search | `Account`, `Contact`, `CustomObject__c` |
| **Primary Field** | String | The main field to display and search | `Name` |
| **Secondary Fields** | String | Additional field to display in search results | `Type` |
| **Tertiary Fields** | String | Third field to display in search results | `Industry` |
| **Allow Multiple Selection** | Boolean | Enable selection of multiple records | `true` or `false` |
| **Display Format** | String | How to display selected records | `pills` or `datatable` |
| **Table Fields** | String | Comma-separated list of fields for datatable | `Name,Type,Industry,AnnualRevenue` |
| **Placeholder Text** | String | Text to display in empty search input | `Search accounts...` |

#### Output Properties

| Property | Type | Description | When Available |
|----------|------|-------------|----------------|
| **Selected Record ID** | String | ID of the selected record | Single selection only |
| **Primary Field Value** | String | Value of the primary field | Single selection only |
| **Secondary Field Value** | String | Value of the secondary field | Single selection only |
| **Tertiary Field Value** | String | Value of the tertiary field | Single selection only |
| **Selected Record IDs** | String[] | Array of selected record IDs | Multiple selection only |
| **Selected Records** | SObject[] | Array of selected record objects | Multiple selection only |

### Example Configurations

#### Single Account Selection
```
Object API Name: Account
Primary Field: Name
Secondary Fields: Type
Tertiary Fields: Industry
Allow Multiple Selection: false
Display Format: pills
Placeholder Text: Search for an account...
```

#### Multiple Contact Selection with Datatable
```
Object API Name: Contact
Primary Field: Name
Secondary Fields: Email
Tertiary Fields: Title
Allow Multiple Selection: true
Display Format: datatable
Table Fields: Name,Email,Title,Account.Name
Placeholder Text: Search contacts...
```

#### Custom Object with Related Fields
```
Object API Name: Opportunity
Primary Field: Name
Secondary Fields: StageName
Tertiary Fields: Account.Name
Allow Multiple Selection: false
Display Format: pills
Placeholder Text: Select an opportunity...
```

## Advanced Features

### Custom Property Editor

The component includes a custom property editor that provides:
- Dynamic object selection with filtered list
- Smart field filtering (only searchable fields shown)
- Real-time validation
- Context-aware field options
- Dual-listbox for table field selection

### Display Formats

#### Pills Display
- Clean, compact representation
- Easy removal with 'x' button
- Ideal for small number of selections
- Shows primary field value
- SLDS-compliant styling

#### Datatable Display
- Tabular view of selected records
- Configurable columns
- Ideal for multiple selections
- Shows all configured fields
- Remove action for each row

### Search Behavior

- **Debounced Search**: 300ms delay prevents excessive API calls
- **Smart Filtering**: Already selected records are hidden from search results
- **Case-Insensitive**: Search is case-insensitive across all configured fields
- **Limit Control**: Maximum 50 results (configurable via code)
- **Dynamic SOQL**: Builds optimized queries based on configuration

## Best Practices

1. **Field Selection**
   - Choose fields that help users identify records
   - Use relationship fields for context (e.g., `Account.Name` on Contact)
   - Avoid long text fields that may truncate
   - Consider field accessibility for all users

2. **Performance**
   - Limit the number of fields to search
   - Use specific search terms
   - Consider adding indexes to frequently searched fields
   - Keep result limits reasonable

3. **User Experience**
   - Provide clear placeholder text
   - Use appropriate display format for use case
   - Configure meaningful field combinations
   - Test with real data volumes

## Technical Details

### API Version
- All components use API version 63.0
- Ensure your org supports this version

### Security
- Component respects object and field-level security
- Uses `with sharing` in Apex controller
- SOQL injection protection with `String.escapeSingleQuotes()`
- No custom permissions required beyond object access

### Browser Compatibility
- Supports all modern browsers
- Lightning Design System compliant
- Accessible with proper ARIA attributes
- Responsive design for all screen sizes

## Troubleshooting

### Common Issues

1. **\"Object API Name is required\" Error**
   - Ensure an object is selected in the configuration
   - Check that the object API name is valid
   - Verify user has access to the object

2. **No Search Results**
   - Verify user has access to the object and fields
   - Check that searchable fields are configured
   - Ensure records exist that match search criteria
   - Check field-level security settings

3. **Fields Not Showing in Configuration**
   - Only text-like fields are available for search
   - Check field-level security settings
   - Ensure fields are accessible to the running user
   - Verify object permissions

4. **Component Not Visible in Flow Builder**
   - Ensure all files are properly deployed
   - Check that API versions match (63.0)
   - Verify metadata configuration
   - Clear Flow Builder cache

### Debug Mode

Enable debug logging by opening browser console. The component logs:
- Configuration on initialization
- Search parameters and results
- Selection changes
- Error details
- Icon loading status

## Limitations

- Maximum 50 search results (configurable in code)
- Search only supports text-like fields and references
- No support for polymorphic lookups
- No recent items functionality
- Single-level relationship fields only (e.g., Account.Name)

## Migration from Previous Versions

If upgrading from an older version:
1. Update all references from `FlowLookupController` to `MsFlowLookupController`
2. Remove any references to the deprecated `flowLookup` component
3. Update API versions to 63.0
4. Test all flows using the component

## Support and Contribution

For issues, feature requests, or contributions:
1. Check existing issues in the repository
2. Create detailed bug reports with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Browser console errors
   - Salesforce org edition and features

## License

This component is provided as-is for use in Salesforce orgs. Modify as needed for your requirements.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

## Acknowledgments

- Built with Salesforce Lightning Web Components
- Uses Salesforce Lightning Design System
- Inspired by standard Salesforce lookup functionality