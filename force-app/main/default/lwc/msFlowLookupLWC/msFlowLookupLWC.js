import { LightningElement, api, track } from 'lwc';
import searchRecords from '@salesforce/apex/MsFlowLookupController.searchRecords';
import getRecordDetails from '@salesforce/apex/MsFlowLookupController.getRecordDetails';
import getObjectIconName from '@salesforce/apex/MsFlowLookupController.getObjectIconName';

/**
 * @description MS Flow Lookup Lightning Web Component
 * A flexible lookup component designed for use in Salesforce Flows.
 * Supports single and multiple record selection with configurable display options.
 * 
 * @author Marc Swan
 * @date 2025
 */
export default class MsFlowLookupLWC extends LightningElement {
    // Input properties (configurable in Flow)
    @api objectApiName = 'Account';
    @api primaryField = 'Name';
    @api secondaryFields = '';
    @api tertiaryFields = '';
    @api allowMultipleSelection = false;
    @api displayFormat = 'pills'; // 'pills' or 'datatable'
    
    /**
     * @description Table fields getter/setter for datatable display
     * Handles both array and comma-separated string formats
     */
    @api
    get tableFields() {
        return this._tableFields;
    }
    set tableFields(value) {
        console.log('flowLookup: Setting tableFields, value:', value, 'type:', typeof value);
        if (Array.isArray(value)) {
            this._tableFields = value;
        } else if (typeof value === 'string' && value) {
            // Handle comma-separated string
            this._tableFields = value.split(',').map(f => f.trim()).filter(f => f);
        } else {
            this._tableFields = [];
        }
        console.log('flowLookup: Parsed tableFields:', this._tableFields);
    }
    
    @api placeholder = 'Search...';
    @api selectedRecordsTitle = 'Selected Records'; // Title for datatable display
    @api recordLimit = 10; // This property exists for backward compatibility but is ignored
    @api whereClause = ''; // This property exists for backward compatibility but is ignored

    // Output properties for Flow
    @api recordId = '';
    @api primaryFieldValue = '';
    @api secondaryFieldValue = '';
    @api tertiaryFieldValue = '';
    @api selectedRecordIds = [];
    @api selectedRecords = [];

    // Internal properties
    @track searchTerm = '';
    @track searchResults = [];
    @track selectedRecordsInternal = [];
    @track isLoading = false;
    @track showDropdown = false;
    @track hasError = false;
    @track errorMessage = '';
    
    // Private properties
    searchTimeout;
    objectIconName = 'standard:account';
    iconLoaded = false;
    _tableFields = [];

    /**
     * @description Lifecycle hook called when component is inserted into DOM
     * Initializes component state and loads pre-selected records if needed
     */
    async connectedCallback() {
        console.log('FlowLookup: Connected with properties:', {
            objectApiName: this.objectApiName,
            primaryField: this.primaryField,
            allowMultipleSelection: this.allowMultipleSelection
        });
        
        // Validate that we have the required properties
        if (!this.objectApiName) {
            console.warn('FlowLookup: No objectApiName provided');
        }
        if (!this.primaryField) {
            console.warn('FlowLookup: No primaryField provided');
        }
        
        // Get the proper icon name for the object
        try {
            const iconName = await getObjectIconName({ objectApiName: this.objectApiName });
            this.objectIconName = iconName || 'standard:account';
            this.iconLoaded = true;
            console.log('Loaded icon for', this.objectApiName, ':', this.objectIconName);
        } catch (error) {
            console.error('Error getting object icon:', error);
            // Use a fallback based on object name
            this.objectIconName = this.getDefaultIconName();
            this.iconLoaded = true;
        }
        
        // Load pre-selected record if recordId is provided
        if (this.recordId && !this.selectedRecordsInternal.length) {
            await this.loadSelectedRecord();
        }
    }

    // Computed properties
    
    /**
     * @description Determines if single selection display should be shown
     * @return {boolean} True if single selection mode with selected record
     */
    get showSingleSelection() {
        return !this.allowMultipleSelection && this.selectedRecordsInternal.length > 0;
    }

    /**
     * @description Determines if multiple selection display should be shown
     * @return {boolean} True if multiple selection mode with selected records
     */
    get showMultipleSelection() {
        return this.allowMultipleSelection && this.selectedRecordsInternal.length > 0;
    }
    
    /**
     * @description Determines if pill container should be displayed
     * @return {boolean} True if multiple selection with pills display format
     */
    get showPillContainer() {
        return this.showMultipleSelection && this.displayFormat === 'pills';
    }
    
    /**
     * @description Determines if datatable should be displayed
     * @return {boolean} True if multiple selection with datatable display format
     */
    get showDatatable() {
        return this.showMultipleSelection && this.displayFormat === 'datatable';
    }
    
    /**
     * @description Generates column configuration for datatable
     * @return {Array} Array of column definitions for lightning-datatable
     */
    get datatableColumns() {
        // If no table fields are specified, use primary field
        const fieldsToShow = this._tableFields && this._tableFields.length > 0 
            ? this._tableFields 
            : [this.primaryField];
            
        console.log('Datatable columns for fields:', fieldsToShow);
            
        return fieldsToShow.map(field => ({
            label: this.getFieldLabel(field),
            fieldName: field,
            type: 'text'
        }));
    }
    
    /**
     * @description Formats selected records for datatable display
     * @return {Array} Array of record data for lightning-datatable
     */
    get datatableData() {
        return this.selectedRecordsInternal.map(record => {
            const data = { Id: record.Id };
            
            // Add all fields from the original record
            if (record.originalRecord) {
                Object.keys(record.originalRecord).forEach(key => {
                    data[key] = record.originalRecord[key];
                });
            }
            
            // Ensure primary field is included
            data[this.primaryField] = record.primaryValue;
            
            return data;
        });
    }
    
    /**
     * @description Generates user-friendly label from field API name
     * @param {string} fieldName - API name of the field
     * @return {string} Formatted field label
     */
    getFieldLabel(fieldName) {
        // Try to get a user-friendly label for the field
        // This is a simplified version - in production you might want to use field describe info
        return fieldName.replace(/__c$/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    /**
     * @description Gets default icon name based on object type
     * @return {string} SLDS icon name
     */
    getDefaultIconName() {
        // Client-side fallback for common objects
        const iconMap = {
            'Account': 'standard:account',
            'Contact': 'standard:contact',
            'Lead': 'standard:lead',
            'Opportunity': 'standard:opportunity',
            'Case': 'standard:case',
            'Task': 'standard:task',
            'Event': 'standard:event',
            'User': 'standard:user',
            'Product2': 'standard:product',
            'Pricebook2': 'standard:pricebook',
            'Campaign': 'standard:campaign',
            'Contract': 'standard:contract',
            'Order': 'standard:orders',
            'Asset': 'standard:asset'
        };
        
        return iconMap[this.objectApiName] || 'standard:record';
    }

    /**
     * @description Gets display value for input field
     * @return {string} Current input value
     */
    get inputValue() {
        if (!this.allowMultipleSelection && this.selectedRecordsInternal.length > 0) {
            return this.selectedRecordsInternal[0].primaryValue;
        }
        return this.searchTerm;
    }

    /**
     * @description Gets CSS class for dropdown container
     * @return {string} CSS class string
     */
    get dropdownClass() {
        return `slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ${this.showDropdown ? 'slds-is-open' : ''}`;
    }

    /**
     * @description Gets CSS class for input field
     * @return {string} CSS class string
     */
    get inputClass() {
        return `slds-input slds-combobox__input ${this.showSingleSelection ? 'slds-combobox__input-value' : ''}`;
    }

    /**
     * @description Parses secondary fields configuration
     * @return {Array} Array of secondary field names
     */
    get secondaryFieldsArray() {
        try {
            // Handle both single field (new) and comma-separated (legacy) formats
            if (!this.secondaryFields) return [];
            
            if (typeof this.secondaryFields === 'string') {
                return this.secondaryFields.split(',').map(f => f.trim()).filter(f => f);
            }
            
            // If it's already an array (shouldn't happen but defensive)
            return Array.isArray(this.secondaryFields) ? this.secondaryFields : [this.secondaryFields];
        } catch (error) {
            console.error('Error parsing secondary fields:', error);
            return [];
        }
    }

    /**
     * @description Parses tertiary fields configuration
     * @return {Array} Array of tertiary field names
     */
    get tertiaryFieldsArray() {
        try {
            // Handle both single field (new) and comma-separated (legacy) formats
            if (!this.tertiaryFields) return [];
            
            if (typeof this.tertiaryFields === 'string') {
                return this.tertiaryFields.split(',').map(f => f.trim()).filter(f => f);
            }
            
            // If it's already an array (shouldn't happen but defensive)
            return Array.isArray(this.tertiaryFields) ? this.tertiaryFields : [this.tertiaryFields];
        } catch (error) {
            console.error('Error parsing tertiary fields:', error);
            return [];
        }
    }

    // Event Handlers

    /**
     * @description Handles input field focus event
     * Shows dropdown and triggers search if needed
     */
    handleInputFocus() {
        console.log('Input focused');
        this.showDropdown = true;
        if (this.searchTerm || this.searchResults.length === 0) {
            this.performSearch();
        }
    }

    /**
     * @description Handles input field change event
     * Implements debounced search functionality
     * @param {Event} event - Input change event
     */
    handleInputChange(event) {
        this.searchTerm = event.target.value;
        this.showDropdown = true;
        
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for debounced search
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    /**
     * @description Handles input field blur event
     * Delays hiding dropdown to allow for option selection
     */
    handleInputBlur() {
        // Delay hiding dropdown to allow for option selection
        setTimeout(() => {
            this.showDropdown = false;
        }, 200);
    }

    /**
     * @description Handles option selection from dropdown
     * @param {Event} event - Click event from option
     */
    handleOptionSelect(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const selectedRecord = this.searchResults.find(record => record.Id === recordId);
        
        if (selectedRecord) {
            this.selectRecord(selectedRecord);
        }
        
        this.showDropdown = false;
        this.searchTerm = '';
    }

    /**
     * @description Handles pill removal in multiple selection mode
     * @param {Event} event - Pill remove event
     */
    handlePillRemove(event) {
        const recordId = event.detail.item.name;
        this.removeRecord(recordId);
    }
    
    /**
     * @description Handles datatable row action
     * @param {Event} event - Row action event
     */
    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        
        if (action.name === 'remove') {
            this.removeRecord(row.Id);
        }
    }

    /**
     * @description Handles clearing selection in single selection mode
     */
    handleClearSelection() {
        this.selectedRecordsInternal = [];
        this.updateOutputProperties();
        this.searchTerm = '';
        // Trigger a new search to refresh the available options
        this.performSearch();
    }

    // Core Methods

    /**
     * @description Selects a record and updates component state
     * @param {Object} record - Record object to select
     */
    selectRecord(record) {
        try {
            const formattedRecord = {
                Id: record.Id,
                primaryValue: record[this.primaryField] || '',
                secondaryValue: this.getSecondaryValue(record),
                tertiaryValue: this.getTertiaryValue(record),
                displayLabel: record[this.primaryField] || record.Id,
                originalRecord: record // Store the original record for datatable
            };

            if (this.allowMultipleSelection) {
                // Check if already selected
                const existingIndex = this.selectedRecordsInternal.findIndex(r => r.Id === record.Id);
                if (existingIndex === -1) {
                    this.selectedRecordsInternal = [...this.selectedRecordsInternal, formattedRecord];
                }
            } else {
                this.selectedRecordsInternal = [formattedRecord];
            }

            this.updateOutputProperties();
        } catch (error) {
            console.error('Error selecting record:', error);
        }
    }

    /**
     * @description Removes a selected record
     * @param {string} recordId - ID of record to remove
     */
    removeRecord(recordId) {
        try {
            this.selectedRecordsInternal = this.selectedRecordsInternal.filter(record => record.Id !== recordId);
            this.updateOutputProperties();
            // If dropdown is open, refresh to show the removed record
            if (this.showDropdown) {
                this.performSearch();
            }
        } catch (error) {
            console.error('Error removing record:', error);
        }
    }

    /**
     * @description Extracts and formats secondary field values from a record
     * @param {Object} record - Record object
     * @return {string} Formatted secondary values
     */
    getSecondaryValue(record) {
        try {
            const secondaryValues = this.secondaryFieldsArray
                .map(field => record[field])
                .filter(value => value)
                .join(' • ');
            return secondaryValues;
        } catch (error) {
            console.error('Error getting secondary value:', error);
            return '';
        }
    }

    /**
     * @description Extracts and formats tertiary field values from a record
     * @param {Object} record - Record object
     * @return {string} Formatted tertiary values
     */
    getTertiaryValue(record) {
        try {
            const tertiaryValues = this.tertiaryFieldsArray
                .map(field => record[field])
                .filter(value => value)
                .join(' • ');
            return tertiaryValues;
        } catch (error) {
            console.error('Error getting tertiary value:', error);
            return '';
        }
    }

    /**
     * @description Updates output properties for Flow consumption
     * Dispatches change event to notify Flow of updates
     */
    updateOutputProperties() {
        try {
            if (this.allowMultipleSelection) {
                this.selectedRecordIds = this.selectedRecordsInternal.map(record => record.Id);
                this.selectedRecords = this.selectedRecordsInternal.map(record => {
                    const recordObj = {
                        Id: record.Id,
                        Name: record.primaryValue // Add Name field for consistency
                    };
                    
                    // Add the actual field values dynamically
                    if (this.primaryField && record.primaryValue) {
                        recordObj[this.primaryField] = record.primaryValue;
                    }
                    
                    // Only add secondary/tertiary fields if they have values
                    if (this.secondaryFieldsArray.length > 0 && record.secondaryValue) {
                        this.secondaryFieldsArray.forEach(field => {
                            recordObj[field] = record.secondaryValue;
                        });
                    }
                    
                    if (this.tertiaryFieldsArray.length > 0 && record.tertiaryValue) {
                        this.tertiaryFieldsArray.forEach(field => {
                            recordObj[field] = record.tertiaryValue;
                        });
                    }
                    
                    return recordObj;
                });
                
                // Clear single selection properties
                this.recordId = '';
                this.primaryFieldValue = '';
                this.secondaryFieldValue = '';
                this.tertiaryFieldValue = '';
            } else {
                if (this.selectedRecordsInternal.length > 0) {
                    const selectedRecord = this.selectedRecordsInternal[0];
                    this.recordId = selectedRecord.Id;
                    this.primaryFieldValue = selectedRecord.primaryValue;
                    this.secondaryFieldValue = selectedRecord.secondaryValue;
                    this.tertiaryFieldValue = selectedRecord.tertiaryValue;
                } else {
                    this.recordId = '';
                    this.primaryFieldValue = '';
                    this.secondaryFieldValue = '';
                    this.tertiaryFieldValue = '';
                }
                
                // Clear multiple selection properties
                this.selectedRecordIds = [];
                this.selectedRecords = [];
            }

            // Dispatch change event for Flow
            const changeEvent = new CustomEvent('change', {
                detail: {
                    recordId: this.recordId,
                    primaryFieldValue: this.primaryFieldValue,
                    secondaryFieldValue: this.secondaryFieldValue,
                    tertiaryFieldValue: this.tertiaryFieldValue,
                    selectedRecordIds: this.selectedRecordIds,
                    selectedRecords: this.selectedRecords
                }
            });
            
            console.log('Dispatching change event:', changeEvent.detail);
            this.dispatchEvent(changeEvent);
        } catch (error) {
            console.error('Error updating output properties:', error);
        }
    }

    /**
     * @description Performs search against Salesforce records
     * Calls Apex controller to search for matching records
     */
    async performSearch() {
        if (!this.objectApiName || !this.primaryField) {
            console.log('Missing required fields for search');
            return;
        }

        this.isLoading = true;
        this.hasError = false;

        try {
            const allFields = [
                this.primaryField,
                ...this.secondaryFieldsArray,
                ...this.tertiaryFieldsArray
            ].filter((field, index, array) => array.indexOf(field) === index); // Remove duplicates

            console.log('Performing search with:', {
                objectApiName: this.objectApiName,
                searchTerm: this.searchTerm,
                fieldsToReturn: allFields
            });

            const result = await searchRecords({
                objectApiName: this.objectApiName,
                searchTerm: this.searchTerm,
                fieldsToReturn: allFields,
                limitResults: 10, // Default limit
                whereClause: '' // No additional where clause
            });

            // Process results to add computed display properties
            this.searchResults = (result || []).map(record => {
                return {
                    ...record,
                    primaryFieldDisplay: record[this.primaryField] || '',
                    secondaryFieldDisplay: this.getSecondaryValue(record),
                    iconName: this.objectIconName // Use the component's icon which was loaded from Apex
                };
            });

            console.log('Search completed. Results:', this.searchResults.length);

        } catch (error) {
            console.error('Search error:', error);
            this.hasError = true;
            
            // Provide specific error messages
            if (error.body?.message?.includes('Invalid object')) {
                this.errorMessage = `The object "${this.objectApiName}" is not accessible or does not exist.`;
            } else if (error.body?.message?.includes('field')) {
                this.errorMessage = 'One or more selected fields are not accessible. Please check your configuration.';
            } else if (error.body?.message?.includes('Object API Name is required')) {
                this.errorMessage = 'Please configure the object to search.';
            } else {
                this.errorMessage = error.body?.message || 'An error occurred while searching. Please try again or contact your administrator.';
            }
            
            this.searchResults = [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * @description Gets filtered search results excluding already selected records
     * @return {Array} Filtered array of search results
     */
    get filteredSearchResults() {
        const selectedIds = this.selectedRecordsInternal.map(r => r.Id);
        return this.searchResults.filter(record => !selectedIds.includes(record.Id));
    }
    
    /**
     * @description Generates pill items for lightning-pill-container
     * @return {Array} Array of pill item configurations
     */
    get pillItems() {
        try {
            return this.selectedRecordsInternal.map(record => ({
                type: 'icon',
                label: record.displayLabel,
                name: record.Id,
                iconName: this.objectIconName,
                fallbackIconName: 'standard:record'
            }));
        } catch (error) {
            console.error('Error creating pill items:', error);
            return [];
        }
    }
    
    /**
     * @description Loads pre-selected record data
     * Called when component is initialized with a recordId
     */
    async loadSelectedRecord() {
        try {
            console.log('Loading pre-selected record:', this.recordId);
            
            const allFields = [
                this.primaryField,
                ...this.secondaryFieldsArray,
                ...this.tertiaryFieldsArray
            ].filter((field, index, array) => array.indexOf(field) === index);
            
            const result = await getRecordDetails({
                objectApiName: this.objectApiName,
                recordIds: [this.recordId],
                fieldsToReturn: allFields
            });
            
            if (result && result.length > 0) {
                this.selectRecord(result[0]);
                console.log('Pre-selected record loaded successfully');
            }
        } catch (error) {
            console.error('Error loading pre-selected record:', error);
        }
    }
}
