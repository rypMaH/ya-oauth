## Python Project Rules

### 1. Use Only Simple Python Constructs
- **Functions Only:** Use functions and standard modules. Avoid classes and object-oriented programming.
- **No OOP:** Do not use `class`, inheritance, or instance methods.
- **Simple Data Structures:** Stick to built-in types like lists, dicts, tuples, sets, and basic data containers.

### 2. Prioritize Clean Code
- **Readable Naming:** Use clear, descriptive names for variables and functions.
- **Consistent Style:** Follow PEP 8 conventions for indentation, line length, and spacing.
- **Limit Function Size:** Each function should do one thing and be short (ideally under 30 lines).
- **Avoid Deep Nesting:** Limit the level of nested `if`, `for`, and `while` blocks to improve readability.
- **Use Docstrings:** Document all functions with clear explanations of arguments, return values, and purpose.

### 3. Imports and Libraries
- **Standard Library Only:** Prefer Python’s standard library unless external packages are explicitly approved.
- **No Custom Frameworks:** Don’t implement “mini OOP” using closures or similar advanced patterns.

### 4. Simplicity & Explicitness
- **Explicit is Better than Implicit:** Avoid “magic” or overly clever code. Write out steps clearly.
- **Don’t Repeat Yourself:** Use simple helper functions to avoid code duplication.

### 5. Error Handling
- **Simple Try/Except:** Use clear error handling, focusing on specific exceptions, not broad except clauses.
- **No Exception Classes**: Do not define custom exception classes; use built-in exception types.

**Summary:**  
Write all logic in plain functions, using basic Python types and the standard library. Keep everything as readable and simple as possible. Avoid anything related to classes, objects, or patterns that mimic OOP. Aim for clean, well-documented code that anyone familiar with Python could instantly understand and maintain.