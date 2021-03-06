function code (object) {
  if (object == undefined) return '';
  if (object.code)
    return object.code;
  else
    return object;
}

exports._Importation = function (opts) {
  var framework = opts.framework;
  if (framework) {
    return {code: '#import <' + framework + '/' + framework + '.h>'};
  }
};

exports._String = function (string) {
  return {type: 'NSString', code: '@"' + string.slice(1, -1) + '"'};
};

exports._Number = function (number) {
  var type;
  if (/\.{1}/.exec(number.toString())) {
    type = 'CGFloat';
  } else {
    type = 'NSInteger';
  }
  
  return {type: type, scalar: true, code: number.toString()};
};

exports._CGShortcut = function (args) {
  
  args = args.map(function (arg) {
    return code(arg);
  });
  
  if (args.length == 4) {
    return {
      type: 'CGRect',
      scalar: true,
      code: 'CGRectMake(' + args.join(', ') + ')'
    };
  } else if (args.length == 2) {
    return {
      type: 'CGPoint',
      scalar: true,
      code: 'CGPointMake(' + args.join(', ') + ')'
    };
  }
}

exports._Construction = function (opts) {
  
  var type = opts.type;
  var message = opts.message;

  if (!message) {
    return {
      type: type,
      code: '[[[' + type + ' alloc] init] autorelease]'
    };
  } else {
    
    if (message instanceof Array) {
      message = message.map(function (arg) {
        return arg.arg + code(arg.value);
      }).join(' ');
    } else message = message;
    
    return {
      type: type,
      code: '[[[' + type + ' alloc] init' + code(message).capitalize() + '] autorelease]'
    }
  }
  
};

exports._Invocation = function (opts) {
  
  var func = opts.func;
  var args = opts.args || [];
  
  args = args.map(function (arg) {
    return code(arg);
  });
  
  return {
    code: opts.func + '(' + args.join(', ') + ')'
  };
  
}

exports._Interface = function (classObj) {
  return {
    code:
    
    '@interface ' + classObj.name + ' : ' + classObj.superclass + '\n\n' +
    classObj.methods.map(function (method) {
      return '\t' + code(method.interface);
    }).join('\n') +
    '\n\n@end'
    //@interface DecisionViewController : UIViewController
    
  }
}

exports._Implementation = function (classObj) {
  return {
    code: 
    
    '@implementation ' + classObj.name + '\n\n' +
    classObj.methods.map(function (method) {
      return '\t' + code(method.implementation);
    }).join('\n\n') +
    '\n\n@end'
    
  }
}

exports._Class = function () {
  
  return {
    name: undefined,
    superclass: undefined,
    protocols: [],
    methods: [],
    properties: [],
    ivars: []
  };
}

exports._Method = function (opts) {

  var operator = opts.operator;
  var signature = opts.signature;
  var block = opts.block;
  
  var type, scalar;
  if (opts.type) {
    type = opts.type;
    scalar = opts.scalar;
  } else {
    type = 'void';
    scalar = true;
  }
  
  var indents = opts.indents || 0;
  var memberOf = opts.memberOf;
  
  if (signature.args) signature = signature.args.join(' ');

  var output = {
    type: type,
    scalar: scalar,
    interface: {
      code: operator + ' ' + '(' + (!scalar ? type + ' *' : type)  + ')' + signature + ';'
    },
    implementation: { 
      code: operator + ' ' + '(' + (!scalar ? type + ' *' : type)  + ')' + signature + ' {\n' + code(block) + '\n' + Array(indents).join('\t') + '}'
    }
  };
  
  if (memberOf) {
    memberOf.methods.push(output); 
  }
  
  return output;
  
};

exports._MethodArg = function (opts) {
  
  var arg = opts.arg;
  var type = (!opts.cast.scalar) ? code(opts.cast.type) + ' *' : code(opts.cast.type);
  
  return code(arg) + '(' + type + ')' + code(arg).slice(0, -1);
  
};

exports._Cast = function (opts) {
  
  var type = opts.type;
  var scalar = opts.scalar;
  
  return {
    type: type,
    scalar: scalar
  };
  
}

exports._Message = function (opts) {
  
  var target = opts.target;
  var args = opts.args;
  var message = opts.message;
  
  var stubs;
  
  if (args) {
    stubs = args.map(function (arg) {
      return arg.arg + code(arg.value);
    }).join(' ');
  } else {
    stubs = code(message);
  }
  
  return {
    code: '[' + code(target) + ' ' + stubs + ']'
  };
  
}

exports._Operation = function (opts) {
  
  var left = opts.left;
  var right = opts.right;
  var operator = opts.operator;
  var type;
  var scalar;
  
  if (left.type == right.type) type = left.type;
  if (left.scalar == right.scalar) scalar = left.scalar;
  
  if (left.parenthetical) {
    left = '(' + code(left) + ')';
  } else {
    left = code(left);
  }
  
  if (right.parenthetical) {
    right = '(' + code(right) + ')';
  } else {
    right = code(right);
  }
    
  
  return {type: type, scalar: scalar, code: left + ' ' + operator + ' ' + right};
  
};

exports._Parenthetical = function (body) {
  return {parenthetical: true, code: code(body).replace(/\t/g, '') };
};

exports._Assignment = function (opts) {

  var scope = opts.scope;
  var type = opts.type || opts.expression.type;
  var scalar = opts.scalar || opts.expression.scalar;
  var identifier = opts.identifier;
  var operator = opts.operator;
  var expression = opts.expression;
  var reassign = false;
  
  scope.forEach(function (tier) {
    tier.forEach(function (assignment) {
      if (identifier && assignment.identifier == identifier) reassign = true;
    });
  });
  
  if (reassign) {
    return {code: identifier + ' ' + operator + ' ' + code(expression)}
  } else {
    scope[scope.length - 1].push({identifier: identifier, type: type});
  
    if (type) {
      if (!scalar) return {code: type + ' *' + identifier + ' ' + operator + ' ' + code(expression)};
      else return {code: type + ' ' + identifier + ' ' + operator + ' ' + code(expression)}
    } else {
        return {code: 'id ' + identifier + ' ' + operator + ' ' + code(expression)};
    }
  }

};