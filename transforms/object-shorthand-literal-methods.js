/**
 * Simplifies object properties in object literals to use ES6 shorthand notation.
 *
 * This handles properties and methods, as well as properties which use literals as keys.
 *
 * e.g.
 *
 * var object = {
 *  identifier: identifier,
 *  'identifier2': identifier2,
 *  method: function() {}
 * }
 *
 * becomes:
 *
 * var object = {
 *  identifier,
 *  identifier2,
 *  method() {}
 * }
 */
module.exports = (file, api, options) => {
  const j = api.jscodeshift;
  const printOptions = options.printOptions || {quote: 'single'};
  const root = j(file.source);

  const isRecursive = (value) => {
    return !!(
      value.id &&
      j(value.body).find(j.Identifier).filter(
        i => i.node.name === value.id.name
      ).size() !== 0
    );
  };

  const canBeSimplified = (key, value) => {
    // Can be simplified if both key and value are the same identifier or if the
    // property is a method that is not recursive
    if (key.type === 'Identifier') {
      return (
          value.type === 'Identifier' &&
          key.name === value.name
        ) || (
          value.type === 'FunctionExpression' &&
          !isRecursive(value)
        );
    }

    // Can be simplified if the key is a string literal which is equal to the
    // identifier name of the value.
    if (key.type === 'Literal') {

      if(value.type === 'Identifier' && key.value === value.name){
          return true;
      }
      if( value.type === 'FunctionExpression' && !isRecursive(value) &&
          isValidIdentifierNameForProperty(key.value) ){
          return true;
      }
    }

    return false;
  };
  const isValidIdentifierNameForProperty = (name) => {
    try {
      new Function(`({${name}: 1})`)(); //eslint-disable-line no-new-func
    } catch (e) {
      return false;
    }

    return true;
  };

  root
    .find(j.Property, {
      method: false,
      shorthand: false,
      computed: false,
    })
    .filter(p => canBeSimplified(p.value.key, p.value.value))
    .forEach(p => {
      if (p.value.key.type === 'Literal') {
        if(p.value.value.type === 'FunctionExpression'){
            p.value.key = j.identifier(p.value.key.value);
            p.value.method = true;
        } else {
            p.value.key = p.value.value;
        }
      }

      if (p.value.value.type === 'Identifier') {
        p.value.shorthand = true;
      } else if (p.value.value.type === 'FunctionExpression') {
        p.value.method = true;
      }
    });

  return root.toSource(printOptions);
};
