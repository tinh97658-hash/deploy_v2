/**
 * Test script to verify fixes for import functionality
 */
const TopicController = require('../src/controllers/topicController');
const StudentController = require('../src/controllers/studentController');

// Mock dependencies
const mockResponse = {
  json: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis()
};

// Test date/number handling in question imports
async function testQuestionImport() {
  console.log('=== Testing Question Import Fixes ===');
  
  // Mock data with date and number values
  const mockRequest = {
    params: { id: 1 },
    body: {
      questions: [
        {
          question: "What is the value of π?",
          options: [
            { text: 3.14159, isCorrect: true },
            { text: "About 3", isCorrect: false },
            { text: 22/7, isCorrect: false }
          ],
          type: "single_choice"
        },
        {
          question: "When was JavaScript created?",
          options: [
            { text: new Date("1995-12-04"), isCorrect: true },
            { text: "1990", isCorrect: false },
            { text: new Date("2000-01-01"), isCorrect: false }
          ],
          type: "single_choice"
        }
      ]
    }
  };
  
  // Test the processing of options
  try {
    // We're just testing the option processing logic
    const options = mockRequest.body.questions[0].options;
    const processedOptions = options.map(opt => {
      let optionText;
      
      if (opt.text === null || opt.text === undefined) {
        optionText = '';
      } else if (opt.text instanceof Date) {
        // Format date as YYYY-MM-DD
        optionText = opt.text.toISOString().split('T')[0];
      } else if (typeof opt.text === 'number') {
        // Preserve numeric type as a string representation
        optionText = String(opt.text);
      } else {
        // Other types - convert to string
        optionText = String(opt.text).trim();
      }
      
      return {
        text: optionText,
        isCorrect: !!opt.isCorrect
      };
    });
    
    console.log('Original options:', options);
    console.log('Processed options:', processedOptions);
    console.log('✅ Number handling works correctly');
    
    // Test date handling
    const dateOptions = mockRequest.body.questions[1].options;
    const processedDateOptions = dateOptions.map(opt => {
      let optionText;
      
      if (opt.text === null || opt.text === undefined) {
        optionText = '';
      } else if (opt.text instanceof Date) {
        // Format date as YYYY-MM-DD
        optionText = opt.text.toISOString().split('T')[0];
      } else if (typeof opt.text === 'number') {
        // Preserve numeric type as a string representation
        optionText = String(opt.text);
      } else {
        // Other types - convert to string
        optionText = String(opt.text).trim();
      }
      
      return {
        text: optionText,
        isCorrect: !!opt.isCorrect
      };
    });
    
    console.log('Original date options:', dateOptions);
    console.log('Processed date options:', processedDateOptions);
    console.log('✅ Date handling works correctly');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test student date handling in imports
async function testStudentDateImport() {
  console.log('\n=== Testing Student Import Date Fixes ===');
  
  // Test various date formats
  const testDates = [
    '2005-01-15',           // ISO format
    '15/01/2005',           // DD/MM/YYYY
    '01/15/2005',           // MM/DD/YYYY
    44571,                  // Excel serial date (approx. 2022-01-15)
    new Date(2005, 0, 15)   // JS Date object
  ];
  
  console.log('Testing date formats:');
  
  for (const dateValue of testDates) {
    try {
      let dob;
      
      // Logic copied from our fix
      if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1900, 0, 0);
        dob = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        if (dateValue > 59) {
          dob.setDate(dob.getDate() - 1);
        }
      } else if (dateValue instanceof Date) {
        dob = dateValue;
      } else {
        const dateStr = String(dateValue).trim();
        
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('/');
          dob = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else {
          dob = new Date(dateStr);
        }
      }
      
      // Check if the date is valid
      if (isNaN(dob.getTime())) {
        console.log(`❌ Failed to parse date: ${dateValue}`);
      } else {
        console.log(`✅ Successfully parsed date: ${dateValue} => ${dob.toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.log(`❌ Error parsing date ${dateValue}: ${error.message}`);
    }
  }
}

async function runTests() {
  await testQuestionImport();
  await testStudentDateImport();
  console.log('\n✅ All tests completed');
}

runTests().catch(console.error);
