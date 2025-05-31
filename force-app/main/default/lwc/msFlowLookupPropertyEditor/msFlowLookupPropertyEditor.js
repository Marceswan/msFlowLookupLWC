import { LightningElement, api, track } from 'lwc';
import getObjectOptions from '@salesforce/apex/MsFlowLookupController.getObjectOptions';
import getFieldOptions from '@salesforce/apex/MsFlowLookupController.getFieldOptions';

/**
 * @description MS Flow Lookup Property Editor Lightning Web Component
 * Custom property editor for configuring the MS Flow Lookup component in Flow Builder.
 * Provides dynamic object and field selection with support for multiple display formats.
 * 
 * @author Marc Swan
 * @date 2025
 */
export default class MsFlowLookupPropertyEditor extends LightningElement {
    // Flow Builder interfaces
    _builderContext = {};
    _inputVariables = [];
    _genericTypeMappings = [];
    
    // Component state
    @track inputValues = {};
    @track objectOptions = [];
    @track fieldOptions = [];
    @track isLoadingObjects = false;
    @track isLoadingFields = false;
    @track selectedObject = '';
    @track displayFormat = 'pills'; // Default display format
    @track showFieldSelectorModal = false;
    @track selectedTableFields = [];
    _tempSelectedTableFields = []; // Private property for temporary storage
    
    // Flow Builder API properties
    
    /**
     * @description Builder context getter/setter
     * Provides context about the Flow Builder environment
     */
    @api
    get builderContext() {
        return this._builderContext;
    }
    set builderContext(context) {
        this._builderContext = context || {};
    }
    
    /**
     * @description Input variables getter/setter
     * Receives current configuration values from Flow Builder
     */
    @api
    get inputVariables() {
        return this._inputVariables;
    }
    set inputVariables(variables) {
        this._inputVariables = variables || [];
        this.initializeValues();
    }
    
    /**
     * @description Generic type mappings getter/setter
     * Handles generic type T mapping for object selection
     */
    @api
    get genericTypeMappings() {
        return this._genericTypeMappings;
    }
    set genericTypeMappings(mappings) {
        this._genericTypeMappings = mappings || [];
    }

    /**
     * @description Initializes component values from Flow Builder input variables
     * Parses configuration and sets up initial state
     */
    initializeValues() {
        console.log('Initializing values from inputVariables:', this._inputVariables);
        
        this.inputValues = {};
        if (this._inputVariables && Array.isArray(this._inputVariables)) {
            this._inputVariables.forEach(variable => {
                this.inputValues[variable.name] = variable.value;
            });
        }
        
        console.log('Initialized inputValues:', this.inputValues);
        
        // Get the current generic type mapping if it exists
        const typeMapping = this._genericTypeMappings?.find(mapping => mapping.typeName === 'T');
        if (typeMapping && typeMapping.typeValue) {
            this.selectedObject = typeMapping.typeValue;
        } else {
            this.selectedObject = this.inputValues.objectApiName || 'Account';
        }
        
        // Initialize display format and table fields
        this.displayFormat = this.inputValues.displayFormat || 'pills';
        
        // Initialize table fields - handle both string and array formats
        if (this.inputValues.tableFields) {
            if (Array.isArray(this.inputValues.tableFields)) {
                this.selectedTableFields = this.inputValues.tableFields;
            } else if (typeof this.inputValues.tableFields === 'string') {
                // Handle comma-separated string format
                this.selectedTableFields = this.inputValues.tableFields.split(',').map(f => f.trim()).filter(f => f);
            }
        } else {
            this.selectedTableFields = [];
        }
    }
    
    /**
     * @description Lifecycle hook called when component is inserted into DOM
     * Sets default values and loads metadata options
     */
    connectedCallback() {
        console.log('FlowLookupPropertyEditor: Connected');
        console.log('FlowLookupPropertyEditor: builderContext:', this._builderContext);
        console.log('FlowLookupPropertyEditor: genericTypeMappings:', this._genericTypeMappings);
        console.log('FlowLookupPropertyEditor: inputValues:', this.inputValues);
        
        // Set defaults for required fields if not provided
        if (!this.inputValues.objectApiName) {
            console.log('Setting default objectApiName to Account');
            this.updateInputVariable('objectApiName', 'Account');
            this.updateGenericTypeMapping('Account');
        }
        
        // Set default placeholder if not provided
        if (!this.inputValues.placeholder) {
            this.updateInputVariable('placeholder', 'Search...');
        }
        
        // Set default selected records title if not provided
        if (!this.inputValues.selectedRecordsTitle) {
            this.updateInputVariable('selectedRecordsTitle', 'Selected Records');
        }
        
        // Set default multiple selection if not provided
        if (this.inputValues.allowMultipleSelection === undefined) {
            this.updateInputVariable('allowMultipleSelection', false);
        }
        
        // Load objects and fields
        this.loadObjectOptions();
        this.loadFieldOptions().then(() => {
            // Ensure primary field is set after fields are loaded
            if (!this.inputValues.primaryField) {
                console.log('Setting default primary field to Name');
                this.updateInputVariable('primaryField', 'Name');
            }
        });
    }

    /**
     * @description Loads available Salesforce objects from Apex
     * Populates object dropdown options
     */
    async loadObjectOptions() {
        this.isLoadingObjects = true;
        try {
            const result = await getObjectOptions();
            this.objectOptions = result || [];
            console.log('Loaded object options:', this.objectOptions.length);
        } catch (error) {
            console.error('Error loading object options:', error);
            // Fallback to common objects
            this.objectOptions = [
                { label: 'Account', value: 'Account' },
                { label: 'Contact', value: 'Contact' },
                { label: 'Lead', value: 'Lead' },
                { label: 'Opportunity', value: 'Opportunity' },
                { label: 'Case', value: 'Case' },
                { label: 'User', value: 'User' }
            ];
        } finally {
            this.isLoadingObjects = false;
        }
    }

    /**
     * @description Loads field options for the selected object
     * Populates field dropdown options
     */
    async loadFieldOptions() {
        if (!this.selectedObject) {
            this.fieldOptions = [];
            return;
        }

        this.isLoadingFields = true;
        try {
            const result = await getFieldOptions({ objectApiName: this.selectedObject });
            this.fieldOptions = result || [];
            console.log('Loaded field options for', this.selectedObject, ':', this.fieldOptions.length);
        } catch (error) {
            console.error('Error loading field options:', error);
            // Fallback to common fields
            this.fieldOptions = [
                { label: 'Name', value: 'Name' },
                { label: 'Type', value: 'Type' },
                { label: 'Description', value: 'Description' },
                { label: 'Owner', value: 'Owner.Name' },
                { label: 'Created Date', value: 'CreatedDate' }
            ];
        } finally {
            this.isLoadingFields = false;
        }
    }

    // Event Handlers

    /**
     * @description Handles object selection change
     * Updates configuration and reloads field options
     * @param {Event} event - Change event from combobox
     */
    async handleObjectChange(event) {
        const newValue = event.detail.value;
        console.log('Object changed to:', newValue);
        this.selectedObject = newValue;
        this.updateInputVariable('objectApiName', newValue);
        
        // Update the generic type mapping
        this.updateGenericTypeMapping(newValue);
        
        // Load new field options first
        await this.loadFieldOptions();
        
        // Reset field selections after loading new options
        this.updateInputVariable('primaryField', 'Name');
        this.updateInputVariable('secondaryFields', '');
        this.updateInputVariable('tertiaryFields', '');
    }

    /**
     * @description Handles primary field selection change
     * @param {Event} event - Change event from combobox
     */
    handlePrimaryFieldChange(event) {
        this.updateInputVariable('primaryField', event.detail.value);
    }

    /**
     * @description Handles secondary field selection change
     * @param {Event} event - Change event from combobox
     */
    handleSecondaryFieldChange(event) {
        this.updateInputVariable('secondaryFields', event.detail.value || '');
    }

    /**
     * @description Handles tertiary field selection change
     * @param {Event} event - Change event from combobox
     */
    handleTertiaryFieldChange(event) {
        this.updateInputVariable('tertiaryFields', event.detail.value || '');
    }

    /**
     * @description Handles multiple selection toggle change
     * @param {Event} event - Change event from checkbox
     */
    handleMultipleSelectionChange(event) {
        const isEnabled = event.target.checked;
        this.updateInputVariable('allowMultipleSelection', isEnabled);
        
        // Reset display format when disabling multiple selection
        if (!isEnabled) {
            this.displayFormat = 'pills';
            this.updateInputVariable('displayFormat', 'pills');
            this.selectedTableFields = [];
            this.updateInputVariable('tableFields', '');
        }
    }
    
    /**
     * @description Handles display format change between pills and datatable
     * @param {Event} event - Click event from button
     */
    handleDisplayFormatChange(event) {
        this.displayFormat = event.target.value;
        this.updateInputVariable('displayFormat', this.displayFormat);
    }
    
    /**
     * @description Opens field selector modal for datatable configuration
     */
    handleOpenFieldSelector() {
        // Initialize temp fields with current selection
        this._tempSelectedTableFields = this.selectedTableFields ? [...this.selectedTableFields] : [];
        this.showFieldSelectorModal = true;
        console.log('Opening field selector with fields:', this._tempSelectedTableFields);
        console.log('Available options:', this.dualListboxOptions);
    }
    
    /**
     * @description Closes field selector modal without saving
     */
    handleCloseFieldSelector() {
        this.showFieldSelectorModal = false;
        this.tempSelectedTableFields = [];
    }
    
    /**
     * @description Handles table field selection change in modal
     * @param {Event} event - Change event from dual listbox
     */
    handleTableFieldsChange(event) {
        console.log('Table fields changed:', event.detail.value);
        this._tempSelectedTableFields = event.detail.value || [];
    }
    
    /**
     * @description Saves field selection from modal
     * Updates configuration with selected table fields
     */
    handleSaveFieldSelection() {
        console.log('Saving table fields:', this._tempSelectedTableFields);
        
        // Update selected fields
        this.selectedTableFields = this._tempSelectedTableFields ? [...this._tempSelectedTableFields] : [];
        
        // Save as comma-separated string for Flow compatibility
        const tableFieldsString = this.selectedTableFields.join(',');
        console.log('Saving as string:', tableFieldsString);
        
        this.updateInputVariable('tableFields', tableFieldsString);
        this.showFieldSelectorModal = false;
        
        // Force update of display format to trigger re-render
        if (this.displayFormat === 'datatable') {
            this.updateInputVariable('displayFormat', 'datatable');
        }
    }

    /**
     * @description Handles placeholder text change
     * @param {Event} event - Change event from input
     */
    handlePlaceholderChange(event) {
        this.updateInputVariable('placeholder', event.target.value);
    }
    
    /**
     * @description Handles selected records title change
     * @param {Event} event - Change event from input
     */
    handleSelectedRecordsTitleChange(event) {
        this.updateInputVariable('selectedRecordsTitle', event.target.value);
    }

    /**
     * @description Validates component configuration
     * Required method for Flow Builder custom property editors
     * @return {Array} Array of validation errors, empty if valid
     */
    @api
    validate() {
        console.log('FlowLookupPropertyEditor: validate() called');
        
        const validity = [];
        
        // Validate required fields
        if (!this.inputValues.objectApiName) {
            validity.push({
                key: 'objectApiName',
                errorString: 'Object API Name is required'
            });
        }
        
        if (!this.inputValues.primaryField) {
            validity.push({
                key: 'primaryField', 
                errorString: 'Primary Field is required'
            });
        }
        
        console.log('FlowLookupPropertyEditor: validation result:', validity);
        return validity;
    }

    /**
     * @description Updates input variable and dispatches change event to Flow Builder
     * @param {string} name - Variable name
     * @param {*} value - New value
     */
    updateInputVariable(name, value) {
        console.log('CPE: Updating variable:', name, '=', value, 'Type:', typeof value);
        
        this.inputValues[name] = value;
        
        const dataType = this.getDataType(value);
        const valueChangedEvent = new CustomEvent('configuration_editor_input_value_changed', {
            bubbles: true,
            composed: true,
            detail: {
                name: name,
                newValue: value,
                newValueDataType: dataType
            }
        });
        
        console.log('CPE: Dispatching event:', valueChangedEvent.detail);
        this.dispatchEvent(valueChangedEvent);
    }
    
    /**
     * @description Updates generic type mapping for object selection
     * @param {string} objectType - Selected object API name
     */
    updateGenericTypeMapping(objectType) {
        console.log('Updating generic type mapping to:', objectType);
        
        const event = new CustomEvent('configuration_editor_generic_type_mapping_changed', {
            bubbles: true,
            composed: true,
            detail: {
                typeName: 'T',
                typeValue: objectType
            }
        });
        
        console.log('Dispatching generic type mapping event:', event.detail);
        this.dispatchEvent(event);
    }

    /**
     * @description Determines data type for Flow Builder
     * @param {*} value - Value to check
     * @return {string} Data type string
     */
    getDataType(value) {
        if (typeof value === 'boolean') return 'Boolean';
        if (typeof value === 'number') return 'Number';
        if (Array.isArray(value)) return 'String[]';
        return 'String';
    }

    // Getter methods for template bindings

    /**
     * @description Gets current object API name
     * @return {string} Object API name
     */
    get objectApiName() {
        const value = this.inputValues.objectApiName || 'Account';
        console.log('Getting objectApiName:', value);
        return value;
    }

    /**
     * @description Gets current primary field
     * @return {string} Primary field API name
     */
    get primaryField() {
        const value = this.inputValues.primaryField || 'Name';
        console.log('Getting primaryField:', value);
        return value;
    }

    /**
     * @description Gets current secondary field
     * @return {string} Secondary field API name
     */
    get secondaryField() {
        const value = this.inputValues.secondaryFields || '';
        console.log('Getting secondaryField:', value);
        return value;
    }

    /**
     * @description Gets current tertiary field
     * @return {string} Tertiary field API name
     */
    get tertiaryField() {
        const value = this.inputValues.tertiaryFields || '';
        console.log('Getting tertiaryField:', value);
        return value;
    }

    /**
     * @description Gets secondary fields as array (backward compatibility)
     * @return {Array} Array of secondary field names
     */
    get secondaryFields() {
        // Keep this for backward compatibility with main component
        const field = this.inputValues.secondaryFields || '';
        return field ? [field] : [];
    }

    /**
     * @description Gets tertiary fields as array (backward compatibility)
     * @return {Array} Array of tertiary field names
     */
    get tertiaryFields() {
        // Keep this for backward compatibility with main component
        const field = this.inputValues.tertiaryFields || '';
        return field ? [field] : [];
    }
    
    /**
     * @description Gets table fields as array
     * @return {Array} Array of selected table field names
     */
    get tableFields() {
        // Return the selected fields as an array for the template
        return this.selectedTableFields || [];
    }

    /**
     * @description Gets multiple selection setting
     * @return {boolean} True if multiple selection is enabled
     */
    get allowMultipleSelection() {
        return this.inputValues.allowMultipleSelection || false;
    }

    /**
     * @description Gets placeholder text
     * @return {string} Placeholder text
     */
    get placeholder() {
        return this.inputValues.placeholder || 'Search...';
    }
    
    /**
     * @description Gets selected records title
     * @return {string} Selected records title
     */
    get selectedRecordsTitle() {
        return this.inputValues.selectedRecordsTitle || 'Selected Records';
    }

    /**
     * @description Gets primary field options
     * @return {Array} Field options for primary field dropdown
     */
    get primaryFieldOptions() {
        return this.fieldOptions;
    }

    /**
     * @description Gets secondary field options with filtering
     * @return {Array} Field options for secondary field dropdown
     */
    get secondaryFieldOptions() {
        const options = [{ label: '-- None --', value: '' }];
        const filteredOptions = this.fieldOptions.filter(field => 
            field.value !== this.primaryField && 
            field.value !== this.tertiaryField
        );
        return [...options, ...filteredOptions];
    }

    /**
     * @description Gets tertiary field options with filtering
     * @return {Array} Field options for tertiary field dropdown
     */
    get tertiaryFieldOptions() {
        const options = [{ label: '-- None --', value: '' }];
        const filteredOptions = this.fieldOptions.filter(field => 
            field.value !== this.primaryField && 
            field.value !== this.secondaryField
        );
        return [...options, ...filteredOptions];
    }
    
    /**
     * @description Determines if field configuration should be shown
     * @return {boolean} True if object is selected
     */
    get showFieldConfiguration() {
        return this.selectedObject && this.selectedObject !== '';
    }
    
    /**
     * @description Gets display text for selected table fields
     * @return {string} Comma-separated field names
     */
    get tableFieldsDisplay() {
        return this.selectedTableFields.join(', ');
    }
    
    /**
     * @description Gets button variant for pills display format
     * @return {string} Button variant (brand or neutral)
     */
    get pillsButtonVariant() {
        return this.displayFormat === 'pills' ? 'brand' : 'neutral';
    }
    
    /**
     * @description Gets button variant for datatable display format
     * @return {string} Button variant (brand or neutral)
     */
    get datatableButtonVariant() {
        return this.displayFormat === 'datatable' ? 'brand' : 'neutral';
    }
    
    /**
     * @description Determines if table fields button should be shown
     * @return {boolean} True if datatable format is selected
     */
    get showTableFieldsButton() {
        return this.displayFormat === 'datatable';
    }
    
    /**
     * @description Gets options for dual listbox in field selector modal
     * @return {Array} Field options formatted for dual listbox
     */
    get dualListboxOptions() {
        return this.fieldOptions.map(field => ({
            label: field.label,
            value: field.value
        }));
    }
    
    /**
     * @description Gets temporary selected table fields for modal
     * @return {Array} Array of temporarily selected field names
     */
    get tempSelectedTableFields() {
        // Ensure we always return an array for the dual listbox
        return this._tempSelectedTableFields || [];
    }
    
    /**
     * @description Sets temporary selected table fields
     * @param {Array} value - Array of field names
     */
    set tempSelectedTableFields(value) {
        this._tempSelectedTableFields = value || [];
    }
}
