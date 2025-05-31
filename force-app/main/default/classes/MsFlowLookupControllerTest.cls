/**
 * @description Test class for MsFlowLookupController.
 * Tests all methods including search functionality, record retrieval, 
 * metadata operations, and error handling scenarios.
 * 
 * @author Marc Swan
 * @date 2025
 */
@isTest
private class MsFlowLookupControllerTest {
    
    /**
     * @description Creates test data including Accounts and Contacts.
     * Sets up 5 test accounts with related contacts for testing search functionality.
     */
    @TestSetup
    static void makeData() {
        // Create test accounts
        List<Account> testAccounts = new List<Account>();
        for (Integer i = 0; i < 5; i++) {
            testAccounts.add(new Account(
                Name = 'Test Account ' + i,
                Type = 'Customer',
                Industry = 'Technology',
                BillingCity = 'San Francisco',
                BillingState = 'CA'
            ));
        }
        insert testAccounts;
        
        // Create test contacts
        List<Contact> testContacts = new List<Contact>();
        for (Account acc : testAccounts) {
            testContacts.add(new Contact(
                FirstName = 'Test',
                LastName = 'Contact ' + acc.Name,
                AccountId = acc.Id,
                Email = 'test@example.com',
                Title = 'Manager'
            ));
        }
        insert testContacts;
    }
    
    /**
     * @description Tests basic search functionality with a search term.
     * Verifies that records matching the search term are returned.
     */
    @isTest
    static void testSearchRecords_BasicSearch() {
        // Test basic search functionality
        List<String> fieldsToReturn = new List<String>{'Name', 'Type', 'Industry'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.searchRecords(
            'Account',
            'Test',
            fieldsToReturn,
            10,
            null
        );
        Test.stopTest();
        
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assert(results.size() > 0, 'Should return test accounts');
        
        for (SObject record : results) {
            System.assert(record.get('Name').toString().contains('Test'), 'Record name should contain Test');
        }
    }
    
    /**
     * @description Tests search functionality with additional WHERE clause.
     * Verifies that records are filtered by both search term and WHERE conditions.
     */
    @isTest
    static void testSearchRecords_WithWhereClause() {
        // Test search with WHERE clause
        List<String> fieldsToReturn = new List<String>{'Name', 'Type'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.searchRecords(
            'Account',
            'Test',
            fieldsToReturn,
            10,
            'Type = \'Customer\''
        );
        Test.stopTest();
        
        System.assertNotEquals(null, results, 'Results should not be null');
        
        for (SObject record : results) {
            System.assertEquals('Customer', record.get('Type'), 'Should only return Customer accounts');
        }
    }
    
    /**
     * @description Tests search with empty search term.
     * Verifies that records are returned without search term filtering.
     */
    @isTest
    static void testSearchRecords_EmptySearchTerm() {
        // Test search with empty search term
        List<String> fieldsToReturn = new List<String>{'Name', 'Type'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.searchRecords(
            'Account',
            '',
            fieldsToReturn,
            5,
            null
        );
        Test.stopTest();
        
        System.assertNotEquals(null, results, 'Results should not be null');
        System.assert(results.size() <= 5, 'Should respect limit parameter');
    }
    
    /**
     * @description Tests that result limits are properly enforced.
     * Verifies the maximum limit of 50 records is respected.
     */
    @isTest
    static void testSearchRecords_LimitEnforcement() {
        // Test that limits are properly enforced
        List<String> fieldsToReturn = new List<String>{'Name'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.searchRecords(
            'Account',
            'Test',
            fieldsToReturn,
            100, // Request more than max allowed
            null
        );
        Test.stopTest();
        
        System.assert(results.size() <= 50, 'Should enforce maximum limit of 50');
    }
    
    /**
     * @description Tests error handling for invalid object names.
     * Verifies appropriate exception is thrown for non-existent objects.
     */
    @isTest
    static void testSearchRecords_InvalidObject() {
        // Test error handling for invalid object
        List<String> fieldsToReturn = new List<String>{'Name'};
        
        Test.startTest();
        try {
            MsFlowLookupController.searchRecords(
                'InvalidObject__c',
                'Test',
                fieldsToReturn,
                10,
                null
            );
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Error searching records'), 'Should contain error message');
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests validation for null object name.
     * Verifies appropriate error message when object name is not provided.
     */
    @isTest
    static void testSearchRecords_NullObjectName() {
        // Test validation for null object name
        List<String> fieldsToReturn = new List<String>{'Name'};
        
        Test.startTest();
        try {
            MsFlowLookupController.searchRecords(
                null,
                'Test',
                fieldsToReturn,
                10,
                null
            );
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assertEquals('Object API Name is required', e.getMessage());
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests validation for empty fields list.
     * Verifies appropriate error message when no fields are specified.
     */
    @isTest
    static void testSearchRecords_EmptyFieldsList() {
        // Test validation for empty fields list
        List<String> fieldsToReturn = new List<String>();
        
        Test.startTest();
        try {
            MsFlowLookupController.searchRecords(
                'Account',
                'Test',
                fieldsToReturn,
                10,
                null
            );
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assertEquals('Fields to return are required', e.getMessage());
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests retrieving record details with valid IDs.
     * Verifies that records are returned with requested fields.
     */
    @isTest
    static void testGetRecordDetails_ValidIds() {
        // Test getting record details with valid IDs
        List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 2];
        List<String> recordIds = new List<String>();
        for (Account acc : accounts) {
            recordIds.add(acc.Id);
        }
        List<String> fieldsToReturn = new List<String>{'Name', 'Type'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.getRecordDetails(
            'Account',
            recordIds,
            fieldsToReturn
        );
        Test.stopTest();
        
        System.assertEquals(2, results.size(), 'Should return 2 records');
        
        for (SObject record : results) {
            System.assertNotEquals(null, record.get('Name'), 'Name should not be null');
            System.assertNotEquals(null, record.get('Id'), 'Id should not be null');
        }
    }
    
    /**
     * @description Tests getRecordDetails with empty record IDs list.
     * Verifies that empty list is returned when no IDs are provided.
     */
    @isTest
    static void testGetRecordDetails_EmptyIds() {
        // Test with empty record IDs list
        List<String> recordIds = new List<String>();
        List<String> fieldsToReturn = new List<String>{'Name'};
        
        Test.startTest();
        List<SObject> results = MsFlowLookupController.getRecordDetails(
            'Account',
            recordIds,
            fieldsToReturn
        );
        Test.stopTest();
        
        System.assertEquals(0, results.size(), 'Should return empty list for empty input');
    }
    
    /**
     * @description Tests validation for null object name in getRecordDetails.
     * Verifies appropriate error message when object name is not provided.
     */
    @isTest
    static void testGetRecordDetails_NullObjectName() {
        // Test validation for null object name
        List<String> recordIds = new List<String>{'001000000000000'};
        List<String> fieldsToReturn = new List<String>{'Name'};
        
        Test.startTest();
        try {
            MsFlowLookupController.getRecordDetails(
                null,
                recordIds,
                fieldsToReturn
            );
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assertEquals('Object API Name is required', e.getMessage());
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests retrieving field labels for a valid object.
     * Verifies that field labels are returned for accessible fields.
     */
    @isTest
    static void testGetObjectFieldLabels_ValidObject() {
        // Test getting field labels for valid object
        Test.startTest();
        Map<String, String> fieldLabels = MsFlowLookupController.getObjectFieldLabels('Account');
        Test.stopTest();
        
        System.assertNotEquals(null, fieldLabels, 'Field labels should not be null');
        System.assert(fieldLabels.size() > 0, 'Should return field labels');
        System.assert(fieldLabels.containsKey('Name'), 'Should contain Name field');
    }
    
    /**
     * @description Tests error handling for invalid object in getObjectFieldLabels.
     * Verifies appropriate exception is thrown for non-existent objects.
     */
    @isTest
    static void testGetObjectFieldLabels_InvalidObject() {
        // Test error handling for invalid object
        Test.startTest();
        try {
            MsFlowLookupController.getObjectFieldLabels('InvalidObject__c');
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Invalid object API name'), 'Should contain error message');
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests validation for null object name in getObjectFieldLabels.
     * Verifies appropriate error message when object name is not provided.
     */
    @isTest
    static void testGetObjectFieldLabels_NullObjectName() {
        // Test validation for null object name
        Test.startTest();
        try {
            MsFlowLookupController.getObjectFieldLabels(null);
            System.assert(false, 'Should have thrown an exception');
        } catch (AuraHandledException e) {
            System.assertEquals('Object API Name is required', e.getMessage());
        }
        Test.stopTest();
    }
    
    /**
     * @description Tests getObjectIconName for various object types.
     * Verifies correct icon names are returned for standard objects,
     * and default icon is returned for invalid objects.
     */
    @isTest
    static void testGetObjectIconName() {
        Test.startTest();
        
        // Test standard object
        String accountIcon = MsFlowLookupController.getObjectIconName('Account');
        System.assertEquals('standard:account', accountIcon, 'Should return correct icon for Account');
        
        // Test another standard object
        String contactIcon = MsFlowLookupController.getObjectIconName('Contact');
        System.assertEquals('standard:contact', contactIcon, 'Should return correct icon for Contact');
        
        // Test invalid object
        String invalidIcon = MsFlowLookupController.getObjectIconName('InvalidObject');
        System.assertEquals('standard:record', invalidIcon, 'Should return default icon for invalid object');
        
        // Test null object
        String nullIcon = MsFlowLookupController.getObjectIconName(null);
        System.assertEquals('standard:record', nullIcon, 'Should return default icon for null object');
        
        Test.stopTest();
    }
    
    /**
     * @description Tests getObjectOptions method.
     * Verifies that accessible objects are returned with proper sorting.
     */
    @isTest
    static void testGetObjectOptions() {
        Test.startTest();
        List<Map<String, String>> objectOptions = MsFlowLookupController.getObjectOptions();
        Test.stopTest();
        
        System.assertNotEquals(null, objectOptions, 'Object options should not be null');
        System.assert(objectOptions.size() > 0, 'Should return at least one object');
        
        // Verify common objects are included
        Boolean hasAccount = false;
        Boolean hasContact = false;
        
        for (Map<String, String> option : objectOptions) {
            if (option.get('value') == 'Account') {
                hasAccount = true;
            }
            if (option.get('value') == 'Contact') {
                hasContact = true;
            }
        }
        
        System.assert(hasAccount, 'Should include Account object');
        System.assert(hasContact, 'Should include Contact object');
    }
    
    /**
     * @description Tests getFieldOptions for valid object.
     * Verifies that accessible fields are returned with proper sorting.
     */
    @isTest
    static void testGetFieldOptions_ValidObject() {
        Test.startTest();
        List<Map<String, String>> fieldOptions = MsFlowLookupController.getFieldOptions('Account');
        Test.stopTest();
        
        System.assertNotEquals(null, fieldOptions, 'Field options should not be null');
        System.assert(fieldOptions.size() > 0, 'Should return at least one field');
        
        // Verify common fields are included
        Boolean hasName = false;
        
        for (Map<String, String> option : fieldOptions) {
            if (option.get('value') == 'Name') {
                hasName = true;
            }
        }
        
        System.assert(hasName, 'Should include Name field');
    }
    
    /**
     * @description Tests getFieldOptions with empty object name.
     * Verifies that empty list is returned for blank object name.
     */
    @isTest
    static void testGetFieldOptions_EmptyObjectName() {
        Test.startTest();
        List<Map<String, String>> fieldOptions = MsFlowLookupController.getFieldOptions('');
        Test.stopTest();
        
        System.assertEquals(0, fieldOptions.size(), 'Should return empty list for empty object name');
    }
}
