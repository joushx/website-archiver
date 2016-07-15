let { Cc, Ci, Cu } = require('chrome');

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// load JNI interface
XPCOMUtils.defineLazyGetter(this, "JNI", function() {
  let scope = {};
  Cu.import("resource://gre/modules/JNI.jsm", scope);
  if (scope.JNI.GetForThread) {
    return scope.JNI;
  }
});

function getExternalStorageDirectory() {
  var my_jenv = null;
  try {
    my_jenv = JNI.GetForThread();

    // create Java class signatures

    var SIG = {
      Environment: 'Landroid/os/Environment;',
      String: 'Ljava/lang/String;',
      File: 'Ljava/io/File;'
    };

    var Environment = JNI.LoadClass(my_jenv, SIG.Environment.substr(1, SIG.Environment.length - 2), {
      static_methods: [
        {name: 'getExternalStorageDirectory', sig: '()' + SIG.File}
      ]
    });

    JNI.LoadClass(my_jenv, SIG.File.substr(1, SIG.File.length - 2), {
      methods: [
        {name: 'getPath', sig: '()' + SIG.String}
      ]
    });

    // get path
    var javaFile_dirExtStore = Environment.getExternalStorageDirectory();
    var javaStr_dirExtStorePath = javaFile_dirExtStore.getPath();
    return JNI.ReadString(my_jenv, javaStr_dirExtStorePath);

  } finally {
    if (my_jenv) {
      JNI.UnloadClasses(my_jenv);
    }
  }
}

exports.getExternalStorageDirectory = getExternalStorageDirectory;