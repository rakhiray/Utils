const fs = require('fs');

// Function to capitalize the first letter of a string
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Function to generate test code for a given class and its fields
const generateTestCode = (className, fields, indent = '    ', parentClass = '') => {
    const fullClassName = parentClass ? ${parentClass}.${className} : className;
    const varName = className.toLowerCase();

    let constructorArgs = '';
    let builderArgs = '';
    let assertions = '';

    Object.keys(fields).forEach((key) => {
        const value = fields[key];
        if (Array.isArray(value)) {
            const listValues = value.map(v => JSON.stringify(v)).join(', ');
            constructorArgs += `Arrays.asList(${listValues}), `;
            builderArgs += ${indent}        .${key}(Arrays.asList(${listValues}))\n;
            assertions += ${indent}assertEquals(Arrays.asList(${listValues}), ${varName}.get${capitalize(key)}());\n;
        } else if (typeof value === 'object' && value !== null) {
            const innerClassName = capitalize(key);
            const innerTestCode = generateTestCode(innerClassName, value, indent + '    ', fullClassName);
            constructorArgs += `${innerClassName.toLowerCase()}, `;
            builderArgs += ${indent}        .${key}(${innerClassName.toLowerCase()})\n;
            assertions += ${indent}assertNotNull(${varName}.get${capitalize(key)}());\n;
            assertions += Object.keys(value).map(innerKey => {
                const innerValue = value[innerKey];
                return ${indent}assertEquals(${JSON.stringify(innerValue)}, ${varName}.get${capitalize(key)}().get${capitalize(innerKey)}());\n;
            }).join('');
        } else {
            constructorArgs += `${JSON.stringify(value)}, `;
            builderArgs += ${indent}        .${key}(${JSON.stringify(value)})\n;
            assertions += ${indent}assertEquals(${JSON.stringify(value)}, ${varName}.get${capitalize(key)}());\n;
        }
    });

    if (constructorArgs.endsWith(', ')) {
        constructorArgs = constructorArgs.slice(0, -2);
    }

    return `
${indent}// When using AllArgsConstructor
${indent}${fullClassName} ${varName}AllArgs = new ${fullClassName}(${constructorArgs});
${indent}// When using Builder
${indent}${fullClassName} ${varName}Builder = ${fullClassName}.builder()
${builderArgs}${indent}        .build();
${indent}// When using NoArgsConstructor
${indent}${fullClassName} ${varName}NoArgs = new ${fullClassName}();
${indent}// Then
${indent}assertNotNull(${varName}AllArgs);
${indent}assertNotNull(${varName}Builder);
${indent}assertNotNull(${varName}NoArgs);
${assertions}
`;
};

// Main function to generate the test class
const generateTestClass = (inputFile) => {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    const outerClassName = 'OuterClass';
    const testCode = generateTestCode(outerClassName, data);

    const testClassTemplate = `
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class ${outerClassName}Test {

    @Test
    public void test${outerClassName}AllConstructorsAndBuilder() {
${testCode}
    }
}
`;

    return testClassTemplate;
};

// Check if input file is provided
if (process.argv.length < 3) {
    console.error('Usage: node generateTest.js <input_json_file>');
    process.exit(1);
}

const inputFile = process.argv[2];
const outputFile = 'GeneratedTest.java';

const testClassCode = generateTestClass(inputFile);

// Write the generated test class to the output file
fs.writeFileSync(outputFile, testClassCode);

console.log(JUnit test class generated and saved to ${outputFile});
