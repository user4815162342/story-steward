function PipeThread(inputStream,out) {

    spawn(function() {
        var isr = new java.io.InputStreamReader(inputStream);
        var br = new java.io.BufferedReader(isr);
        var line = null;
        while ((line = br.readLine()) != null) {
            out.println(line);
        }
        
    });
    
}

function RunProcess(cmdArgs, workingDirectory, out) {

    if (!out) {
		out = java.lang.System.out;
	}

    var p = java.lang.Runtime.getRuntime().exec(cmdArgs, null, new java.io.File(workingDirectory));
    
    try {
        // simply close the output stream (actually the input stream, 
        // it's output from our process to the new one) to avoid weird deadlocks.
        p.getOutputStream().close();
        
        PipeThread(p.getInputStream(),out);
        
        PipeThread(p.getErrorStream(),out);
        
        
        // wait for process completion
        var exitCode = p.waitFor();
        if (exitCode != 0) {
            throw "Process ended with exit code: " + exitCode;
        }
    } finally {
        p.destroy();
    }
    
}
