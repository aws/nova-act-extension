import * as assert from 'assert';

import { splitPythonCode } from '../../core/utils/splitPythonCode';
import '../setup';

describe('SplitPythonCode Test Suite', () => {
  describe('splitPythonCode', () => {
    it('should return empty array for empty code', () => {
      const result = splitPythonCode('');
      assert.deepStrictEqual(result, []);
    });

    it('should return empty array for whitespace-only code', () => {
      const result = splitPythonCode('   \n\n\t  \n  ');
      assert.deepStrictEqual(result, []);
    });

    it('should handle single line of code', () => {
      const code = 'print("hello")';
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], 'print("hello")');
    });

    it('should group consecutive import statements into one cell', () => {
      const code = `import os

import sys

from typing import List`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('import os'));
      assert.ok(result[0]?.includes('import sys'));
      assert.ok(result[0]?.includes('from typing import List'));
    });

    it('should split class definitions into separate cells', () => {
      const code = `class ToolUse:
    tool: str
    purpose: str = None

class FinalResponse:
    status: str
    message: str

def get_response_schema():
    return {"type": "object"}`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 3);
      assert.ok(result[0]?.includes('class ToolUse:'));
      assert.ok(result[1]?.includes('class FinalResponse:'));
      assert.ok(result[2]?.includes('def get_response_schema():'));
    });

    it('should keep class methods together with class definition', () => {
      const code = `class MyClass:
    def __init__(self):
        self.value = 42
    
    def get_value(self):
        return self.value`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('class MyClass:'));
      assert.ok(result[0]?.includes('def __init__(self):'));
      assert.ok(result[0]?.includes('def get_value(self):'));
    });

    it('should split top-level function definitions', () => {
      const code = `def function1():
    return "hello"

def function2():
    return "world"`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('def function1():'));
      assert.ok(result[1]?.includes('def function2():'));
    });

    it('should handle if __name__ == "__main__" blocks', () => {
      const code = `def main():
    print("Hello")

if __name__ == "__main__":
    main()`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('def main():'));
      assert.ok(result[1]?.includes('if __name__ == "__main__":'));
    });

    it('should split top-level control flow statements', () => {
      const code = `if condition:
    do_something()

for i in range(10):
    print(i)

while True:
    break`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 3);
      assert.ok(result[0]?.includes('if condition:'));
      assert.ok(result[1]?.includes('for i in range(10):'));
      assert.ok(result[2]?.includes('while True:'));
    });

    it('should keep if-else blocks together', () => {
      const code = `if condition:
    print("true")
else:
    print("false")`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('if condition:'));
      assert.ok(result[0]?.includes('else:'));
    });

    it('should keep try-except blocks together', () => {
      const code = `try:
    risky_operation()
except Exception as e:
    print(f"Error: {e}")
finally:
    cleanup()`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('try:'));
      assert.ok(result[0]?.includes('except Exception'));
      assert.ok(result[0]?.includes('finally:'));
    });
    it('groups top-level comments with the following statement', () => {
      const code = `# This is a comment
import os

# Another comment
def func():
    return 42

# Final comment
print("done")`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);

      assert.ok(result[0]?.includes('# This is a comment'));
      assert.ok(result[0]?.includes('import os'));

      assert.ok(result[1]?.includes('# Another comment'));
      assert.ok(result[1]?.includes('def func():'));
      assert.ok(result[1]?.includes('# Final comment'));
      assert.ok(result[1]?.includes('print("done")'));
    });

    it('should handle nested indentation correctly', () => {
      const code = `def outer():
    def inner():
        if True:
            for i in range(2):
                print(i)
    inner()`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('def outer():'));
      assert.ok(result[0]?.includes('def inner():'));
      assert.ok(result[0]?.includes('for i in range(2):'));
    });

    it('should handle mixed content correctly', () => {
      const code = `import os
import sys

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def process(self):
        return len(self.data)

def helper_function():
    return "helper"

if __name__ == "__main__":
    processor = DataProcessor()
    print(helper_function())`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 4);

      // Check imports are grouped together
      assert.ok(result[0]?.includes('import os'));
      assert.ok(result[0]?.includes('import sys'));

      // Check class definition
      assert.ok(result[1]?.includes('class DataProcessor:'));
      assert.ok(result[1]?.includes('def __init__(self):'));
      assert.ok(result[1]?.includes('def process(self):'));

      // Check function definition
      assert.ok(result[2]?.includes('def helper_function():'));

      // Check main block
      assert.ok(result[3]?.includes('if __name__ == "__main__":'));
      assert.ok(result[3]?.includes('processor = DataProcessor()'));
    });

    it('should handle docstrings correctly', () => {
      const code = `"""
This is a module docstring.
"""

def function_with_docstring():
    """This function has a docstring."""
    return True`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('"""'));
      assert.ok(result[0]?.includes('This is a module docstring.'));
      assert.ok(result[1]?.includes('def function_with_docstring():'));
      assert.ok(result[1]?.includes('This function has a docstring.'));
    });

    it('should handle the original user case - malformed class definitions', () => {
      const code = `class ToolUse(BaseModel):tool: strpurpose: Optional[str] = Noneclass FinalResponse(BaseModel):status: Literal["completed"]message: strflight_details: Optional[dict] = Nonedef get_response_schema():return {"type": "object","oneOf": [ToolUse.model_json_schema(),FinalResponse.model_json_schema()]}`;

      const result = splitPythonCode(code);

      // Malformed code on single line should be treated as one cell
      assert.strictEqual(result.length, 1);

      // Verify all content is preserved
      const allContent = result.join('\n');
      assert.ok(allContent.includes('class ToolUse(BaseModel)'), 'Should contain ToolUse class');
      assert.ok(
        allContent.includes('class FinalResponse(BaseModel)'),
        'Should contain FinalResponse class'
      );
      assert.ok(
        allContent.includes('def get_response_schema()'),
        'Should contain function definition'
      );
    });

    it('should handle properly formatted class definitions', () => {
      const code = `class ToolUse(BaseModel):
    tool: str
    purpose: Optional[str] = None

class FinalResponse(BaseModel):
    status: Literal["completed"]
    message: str
    flight_details: Optional[dict] = None

def get_response_schema():
    return {
        "type": "object",
        "oneOf": [
            ToolUse.model_json_schema(),
            FinalResponse.model_json_schema()
        ]
    }`;

      const result = splitPythonCode(code);

      // Should split into separate cells for independent class and function definitions
      assert.strictEqual(result.length, 3);

      // First cell should contain first class
      assert.ok(result[0]?.includes('class ToolUse(BaseModel):'));
      assert.ok(result[0]?.includes('tool: str'));

      // Second cell should contain second class
      assert.ok(result[1]?.includes('class FinalResponse(BaseModel):'));
      assert.ok(result[1]?.includes('status: Literal["completed"]'));

      // Third cell should contain function
      assert.ok(result[2]?.includes('def get_response_schema():'));
      assert.ok(result[2]?.includes('return {'));
    });

    it('should filter out empty cells', () => {
      const code = `

import os



def func():
    pass


`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('import os'));
      assert.ok(result[1]?.includes('def func():'));
    });

    it('should handle multi-line strings with fake code inside (double quotes)', () => {
      const code = `config = """
def fake_function():
    return 'this is inside a string'
"""

def real_function():
    return 'this is real code'`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('config = """'));
      assert.ok(result[0]?.includes('def fake_function():'));
      assert.ok(result[0]?.includes('this is inside a string'));
      assert.ok(result[0]?.includes('"""'));
      assert.ok(result[1]?.includes('def real_function():'));
      assert.ok(result[1]?.includes('this is real code'));
    });

    it('should handle multi-line strings with fake code inside (single quotes)', () => {
      const code = `config = '''
class FakeClass:
    def method(self):
        return "inside string"
'''

class RealClass:
    pass`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes("config = '''"));
      assert.ok(result[0]?.includes('class FakeClass:'));
      assert.ok(result[0]?.includes('inside string'));
      assert.ok(result[0]?.includes("'''"));
      assert.ok(result[1]?.includes('class RealClass:'));
    });

    it('should handle single-line multi-line strings', () => {
      const code = `"""Shopping automation: Search for a book on Amazon and extract details."""
import x

"""Another docstring"""
def function():
    return 'test'`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('Shopping automation'));
      assert.ok(result[0]?.includes('import x'));
      assert.ok(result[1]?.includes('Another docstring'));
      assert.ok(result[1]?.includes('def function():'));
    });

    it('should handle mixed quote types in same line', () => {
      const code = `text = """Start""" + '''middle''' + """end"""
def function():
    return 'test'`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('text = """Start""" + \'\'\'middle\'\'\' + """end"""'));
      assert.ok(result[1]?.includes('def function():'));
    });

    it('should split .act() method calls into separate cells', () => {
      const code = `def setup():
    return "setup complete"

browser.act("click the login button")
print("after first act")

browser.act("type username")
nova.act("scroll down")
nova.act("scroll up")
print("done")`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 5);
      assert.ok(result[0]?.includes('def setup():'));
      assert.ok(result[1]?.includes('browser.act("click the login button")'));
      assert.ok(result[1]?.includes('print("after first act")'));
      assert.ok(result[2]?.includes('browser.act("type username")'));
      assert.ok(result[3]?.includes('nova.act("scroll down")'));
      assert.ok(result[4]?.includes('nova.act("scroll up")'));
      assert.ok(result[4]?.includes('print("done")'));
    });

    it('should not split on .act() in comments or strings', () => {
      const code = `def helper():
      # This comment mentions .act() method
      print("string with .act() inside")
      return "done"
      
browser.act("real call")
print("after real act call")`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('def helper():'));
      assert.ok(result[0]?.includes('# This comment mentions .act() method'));
      assert.ok(result[0]?.includes('print("string with .act() inside")'));
      assert.ok(result[1]?.includes('browser.act("real call")'));
      assert.ok(result[1]?.includes('print("after real act call")'));
    });

    it('does not split on .act() inside a function; splits when we have new top level statement', () => {
      const code = `def f():
  x = 1
  browser.act("inside")
  browser.act("another act")
  if x:
    print("ok")
      
if true:
  print("new cell with top level statement")`;

      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      // cell 1 = whole def body (including .act)
      assert.ok(result[0]?.includes('def f():'));
      assert.ok(result[0]?.includes('browser.act("inside")'));
      assert.ok(result[0]?.includes('browser.act("another act")'));
      assert.ok(result[0]?.includes('print("ok")'));
      // cell 2 = top-level code after the def
      assert.ok(result[1]?.startsWith('if true'));
      assert.ok(result[1]?.includes('print("new cell with top level statement")'));
    });

    it('does not split inside class methods (including .act and control flow)', () => {
      const code = `class C:
    def m(self):
        self.nova.act("inside class method")
        for i in range(2):
            if i:
                print(i)
x = 1`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('class C:'));
      assert.ok(result[0]?.includes('self.nova.act("inside class method")'));
      assert.ok(result[0]?.includes('for i in range(2):'));
      assert.ok(result[1]?.includes('x = 1')); // split after dedent to top level
    });

    it('keeps multi-line strings and nested control flow inside a function in one cell', () => {
      const code = `def g():
    s = """
multi
line
"""
    for j in range(2):
        if j == 1:
            print("inner")
    return True`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 1);
      assert.ok(result[0]?.includes('def g():'));
      assert.ok(result[0]?.includes('"""'));
      assert.ok(result[0]?.includes('for j in range(2):'));
      assert.ok(result[0]?.includes('return True'));
    });

    it('keeps indented comments inside defs; top-level comments attach to following code', () => {
      const code = `def h():
    # inside function
    val = 42

# top-level comment about y
y = 2`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      // indented comment stays with the def cell
      assert.ok(result[0]?.includes('def h():'));
      assert.ok(result[0]?.includes('# inside function'));
      assert.ok(result[0]?.includes('val = 42'));
      // top-level comment should attach to the y=2 cell
      assert.ok(result[1]?.includes('# top-level comment about y'));
      assert.ok(result[1]?.includes('y = 2'));
    });

    it('adjacent top-level .act() calls split into separate cells; mid comment carries to next act', () => {
      const code = `nova.act("A")
# mid
nova.act("B")`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('nova.act("A")'));
      // the mid comment should carry to the second act cell
      assert.ok(result[1]?.includes('# mid'));
      assert.ok(result[1]?.includes('nova.act("B")'));
    });

    it('assignments inside functions do not split; top-level assignment does', () => {
      const code = `def k():
    a = 1
    b = 2
c = 3`;
      const result = splitPythonCode(code);
      assert.strictEqual(result.length, 2);
      assert.ok(result[0]?.includes('def k():'));
      assert.ok(result[0]?.includes('a = 1'));
      assert.ok(result[0]?.includes('b = 2'));
      assert.ok(result[1]?.includes('c = 3')); // top-level assignment split
    });
  });
});
