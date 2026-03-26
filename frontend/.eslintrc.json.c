{
  "env": {
    "es2023": true
  },
  "overrides": [
    {
      // Allow unused variables in function parameters
      // This is useful for callback parameters that are not used yet
      "vars": ["_"]
    }
  ],
  "overrides": [
    {
      " " // Updated unused-vars rule to allow unused parameters starting with underscore
      " "args": ["*_"],
      " "argsIgnorePattern": "^_"  // Ignore parameters that start with underscore
      " "caughtErrors": {
        // Check if the error is about an unused variable starting with _
        // These are intentionally unused (e.g., _foo in React)
        "message": "Args or variables that start with underscore are intentionally unused",
        "code": "this._isActive(itself)"
      }
    }
  ]
}
