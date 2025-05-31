/**
 * @description Controller class for the MS Flow Lookup Lightning Web Component.
 * Provides server-side functionality for searching records, retrieving record details,
 * and getting metadata information about Salesforce objects and fields.
 * 
 * @author Marc Swan
 * @date 2025
 */
public with sharing class MsFlowLookupController {
    
    /**
     * @description Searches for records based on the provided search criteria.
     * Builds a dynamic SOQL query with search term matching across specified fields.
     * 
     * @param objectApiName The API name of the Salesforce object to search
     * @param searchTerm The search term to match against the specified fields
     * @param fieldsToReturn List of field API names to include in the search results
     * @param limitResults Maximum number of records to return (capped at 50)
     * @param whereClause Additional WHERE clause conditions to filter results
     * @return List<SObject> List of records matching the search criteria
     * @throws AuraHandledException If validation fails or query execution errors occur
     */
    @AuraEnabled(cacheable=true)
    public static List<SObject> searchRecords(
        String objectApiName,
        String searchTerm,
        List<String> fieldsToReturn,
        Integer limitResults,
        String whereClause
    ) {
        try {
            // Validate inputs
            if (String.isBlank(objectApiName)) {
                throw new AuraHandledException('Object API Name is required');
            }
            
            if (fieldsToReturn == null || fieldsToReturn.isEmpty()) {
                throw new AuraHandledException('Fields to return are required');
            }
            
            // Ensure Id is always included
            Set<String> fieldSet = new Set<String>(fieldsToReturn);
            fieldSet.add('Id');
            
            // Build SOQL query
            String soqlQuery = 'SELECT ' + String.join(new List<String>(fieldSet), ', ') + 
                              ' FROM ' + objectApiName;
            
            // Add search conditions
            List<String> conditions = new List<String>();
            
            // Add search term condition if provided
            if (String.isNotBlank(searchTerm)) {
                List<String> searchConditions = new List<String>();
                for (String field : fieldsToReturn) {
                    if (field != 'Id') {
                        searchConditions.add(field + ' LIKE \'%' + String.escapeSingleQuotes(searchTerm) + '%\'');
                    }
                }
                if (!searchConditions.isEmpty()) {
                    conditions.add('(' + String.join(searchConditions, ' OR ') + ')');
                }
            }
            
            // Add custom where clause if provided
            if (String.isNotBlank(whereClause)) {
                conditions.add('(' + whereClause + ')');
            }
            
            // Add WHERE clause if there are conditions
            if (!conditions.isEmpty()) {
                soqlQuery += ' WHERE ' + String.join(conditions, ' AND ');
            }
            
            // Add LIMIT clause
            Integer queryLimit = limitResults != null && limitResults > 0 ? limitResults : 10;
            queryLimit = Math.min(queryLimit, 50); // Enforce maximum limit
            soqlQuery += ' LIMIT ' + queryLimit;
            
            // Execute query
            List<SObject> results = Database.query(soqlQuery);
            
            return results;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error searching records: ' + e.getMessage());
        }
    }
    
    /**
     * @description Retrieves detailed information for a list of record IDs.
     * Used to load pre-selected records or refresh record data.
     * 
     * @param objectApiName The API name of the Salesforce object
     * @param recordIds List of record IDs to retrieve
     * @param fieldsToReturn List of field API names to include in the results
     * @return List<SObject> List of records with the requested field values
     * @throws AuraHandledException If validation fails or query execution errors occur
     */
    @AuraEnabled(cacheable=true)
    public static List<SObject> getRecordDetails(
        String objectApiName,
        List<String> recordIds,
        List<String> fieldsToReturn
    ) {
        try {
            // Validate inputs
            if (String.isBlank(objectApiName)) {
                throw new AuraHandledException('Object API Name is required');
            }
            
            if (recordIds == null || recordIds.isEmpty()) {
                return new List<SObject>();
            }
            
            if (fieldsToReturn == null || fieldsToReturn.isEmpty()) {
                throw new AuraHandledException('Fields to return are required');
            }
            
            // Ensure Id is always included
            Set<String> fieldSet = new Set<String>(fieldsToReturn);
            fieldSet.add('Id');
            
            // Build SOQL query
            String soqlQuery = 'SELECT ' + String.join(new List<String>(fieldSet), ', ') + 
                              ' FROM ' + objectApiName +
                              ' WHERE Id IN :recordIds';
            
            // Execute query
            List<SObject> results = Database.query(soqlQuery);
            
            return results;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error retrieving record details: ' + e.getMessage());
        }
    }
    
    /**
     * @description Retrieves a list of available Salesforce objects for the property editor.
     * Filters out system objects, custom settings, and certain managed package objects.
     * 
     * @return List<Map<String, String>> List of objects with label and value properties
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getObjectOptions() {
        try {
            List<Map<String, String>> objectOptions = new List<Map<String, String>>();
            
            // Get all sObject types
            Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
            
            for (String objectName : globalDescribe.keySet()) {
                Schema.SObjectType objectType = globalDescribe.get(objectName);
                Schema.DescribeSObjectResult objectDescribe = objectType.getDescribe();
                
                // Filter for accessible, createable objects that are not custom settings
                if (objectDescribe.isAccessible() && 
                    objectDescribe.isCreateable() && 
                    !objectDescribe.isCustomSetting() &&
                    !objectName.contains('__mdt') &&
                    !objectName.contains('__e') &&
                    !objectName.contains('__History') &&
                    !objectName.contains('__Share') &&
                    !objectName.contains('__Feed') &&
                    !objectName.startsWith('SBQQ__') &&
                    !objectName.startsWith('blng__') &&
                    !objectName.startsWith('FSL__')) {
                    
                    objectOptions.add(new Map<String, String>{
                        'label' => objectDescribe.getLabel(),
                        'value' => objectName
                    });
                }
            }
            
            // Sort by label
            objectOptions.sort(new ObjectOptionComparator());
            
            return objectOptions;
            
        } catch (Exception e) {
            // Return common objects as fallback
            return new List<Map<String, String>>{
                new Map<String, String>{'label' => 'Account', 'value' => 'Account'},
                new Map<String, String>{'label' => 'Contact', 'value' => 'Contact'},
                new Map<String, String>{'label' => 'Lead', 'value' => 'Lead'},
                new Map<String, String>{'label' => 'Opportunity', 'value' => 'Opportunity'},
                new Map<String, String>{'label' => 'Case', 'value' => 'Case'},
                new Map<String, String>{'label' => 'User', 'value' => 'User'}
            };
        }
    }
    
    /**
     * @description Retrieves available fields for a specified Salesforce object.
     * Filters fields to include only those suitable for search and display
     * (string-like fields and references).
     * 
     * @param objectApiName The API name of the Salesforce object
     * @return List<Map<String, String>> List of fields with label and value properties
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getFieldOptions(String objectApiName) {
        try {
            if (String.isBlank(objectApiName)) {
                return new List<Map<String, String>>();
            }
            
            List<Map<String, String>> fieldOptions = new List<Map<String, String>>();
            
            Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
            if (objectType == null) {
                return fieldOptions;
            }
            
            Map<String, Schema.SObjectField> fieldMap = objectType.getDescribe().fields.getMap();
            
            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
                
                // Include accessible string-like fields
                if (fieldDescribe.isAccessible() && 
                    (fieldDescribe.getType() == Schema.DisplayType.STRING ||
                     fieldDescribe.getType() == Schema.DisplayType.TEXTAREA ||
                     fieldDescribe.getType() == Schema.DisplayType.EMAIL ||
                     fieldDescribe.getType() == Schema.DisplayType.PHONE ||
                     fieldDescribe.getType() == Schema.DisplayType.URL ||
                     fieldDescribe.getType() == Schema.DisplayType.PICKLIST ||
                     fieldDescribe.getType() == Schema.DisplayType.MULTIPICKLIST ||
                     fieldDescribe.getType() == Schema.DisplayType.REFERENCE)) {
                    
                    String fieldLabel = fieldDescribe.getLabel();
                    String fieldApiName = fieldDescribe.getName();
                    
                    // For reference fields, check if we should use a related field
                    if (fieldDescribe.getType() == Schema.DisplayType.REFERENCE && 
                        fieldApiName.endsWith('Id') && 
                        fieldApiName != 'Id') {
                        // Add the relationship name field (e.g., Owner.Name for OwnerId)
                        String relationshipName = fieldApiName.substring(0, fieldApiName.length() - 2);
                        fieldOptions.add(new Map<String, String>{
                            'label' => fieldLabel + ' Name',
                            'value' => relationshipName + '.Name'
                        });
                    } else if (fieldApiName != 'Id') {
                        fieldOptions.add(new Map<String, String>{
                            'label' => fieldLabel,
                            'value' => fieldApiName
                        });
                    }
                }
            }
            
            // Sort by label
            fieldOptions.sort(new FieldOptionComparator());
            
            return fieldOptions;
            
        } catch (Exception e) {
            // Return common fields as fallback
            return new List<Map<String, String>>{
                new Map<String, String>{'label' => 'Name', 'value' => 'Name'},
                new Map<String, String>{'label' => 'Type', 'value' => 'Type'},
                new Map<String, String>{'label' => 'Description', 'value' => 'Description'},
                new Map<String, String>{'label' => 'Owner', 'value' => 'Owner.Name'},
                new Map<String, String>{'label' => 'Created Date', 'value' => 'CreatedDate'}
            };
        }
    }
    
    /**
     * @description Comparator class for sorting object options alphabetically by label.
     * Implements the Comparator interface for Map<String, String> objects.
     */
    public class ObjectOptionComparator implements Comparator<Map<String, String>> {
        /**
         * @description Compares two object option maps by their label values
         * @param o1 First object option map
         * @param o2 Second object option map
         * @return Integer indicating sort order (-1, 0, or 1)
         */
        public Integer compare(Map<String, String> o1, Map<String, String> o2) {
            String label1 = o1.get('label');
            String label2 = o2.get('label');
            return label1.compareTo(label2);
        }
    }
    
    /**
     * @description Comparator class for sorting field options alphabetically by label.
     * Implements the Comparator interface for Map<String, String> objects.
     */
    public class FieldOptionComparator implements Comparator<Map<String, String>> {
        /**
         * @description Compares two field option maps by their label values
         * @param o1 First field option map
         * @param o2 Second field option map
         * @return Integer indicating sort order (-1, 0, or 1)
         */
        public Integer compare(Map<String, String> o1, Map<String, String> o2) {
            String label1 = o1.get('label');
            String label2 = o2.get('label');
            return label1.compareTo(label2);
        }
    }
    
    /**
     * @description Retrieves field labels for all accessible fields of a Salesforce object.
     * Returns a map of field API names to their user-friendly labels.
     * 
     * @param objectApiName The API name of the Salesforce object
     * @return Map<String, String> Map of field API names to labels
     * @throws AuraHandledException If object API name is invalid or empty
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getObjectFieldLabels(String objectApiName) {
        try {
            if (String.isBlank(objectApiName)) {
                throw new AuraHandledException('Object API Name is required');
            }
            
            Map<String, String> fieldLabels = new Map<String, String>();
            
            Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
            if (objectType == null) {
                throw new AuraHandledException('Invalid object API name: ' + objectApiName);
            }
            
            Map<String, Schema.SObjectField> fieldMap = objectType.getDescribe().fields.getMap();
            
            for (String fieldName : fieldMap.keySet()) {
                Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
                if (fieldDescribe.isAccessible()) {
                    fieldLabels.put(fieldName, fieldDescribe.getLabel());
                }
            }
            
            return fieldLabels;
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    /**
     * @description Determines the appropriate SLDS icon name for a given Salesforce object.
     * Maps standard objects to their corresponding icons and generates custom object icons.
     * 
     * @param objectApiName The API name of the Salesforce object
     * @return String The SLDS icon name (e.g., 'standard:account')
     */
    @AuraEnabled(cacheable=true)
    public static String getObjectIconName(String objectApiName) {
        try {
            Schema.SObjectType objectType = Schema.getGlobalDescribe().get(objectApiName);
            if (objectType != null) {
                Schema.DescribeSObjectResult describe = objectType.getDescribe();
                
                // Map of standard objects to their icon names
                Map<String, String> standardIcons = new Map<String, String>{
                    'Account' => 'standard:account',
                    'Contact' => 'standard:contact',
                    'Lead' => 'standard:lead',
                    'Opportunity' => 'standard:opportunity',
                    'Case' => 'standard:case',
                    'Task' => 'standard:task',
                    'Event' => 'standard:event',
                    'User' => 'standard:user',
                    'Product2' => 'standard:product',
                    'Pricebook2' => 'standard:pricebook',
                    'Campaign' => 'standard:campaign',
                    'Contract' => 'standard:contract',
                    'Order' => 'standard:orders',
                    'Solution' => 'standard:solution',
                    'Asset' => 'standard:asset',
                    'WorkOrder' => 'standard:work_order',
                    'ServiceAppointment' => 'standard:service_appointment'
                };
                
                if (standardIcons.containsKey(objectApiName)) {
                    return standardIcons.get(objectApiName);
                }
                
                // For custom objects
                if (describe.isCustom()) {
                    return 'custom:custom' + describe.getKeyPrefix();
                }
                
                // Default fallback
                return 'standard:record';
            }
            return 'standard:record';
        } catch (Exception e) {
            return 'standard:record';
        }
    }
}
