function PipeThread(inputStream,out) {

    return spawn(function() {
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
    var fileOutput;
    if (typeof out === typeof "") {
        fileOutput = new java.io.FileOutputStream(out);
        out = new java.io.PrintStream(fileOutput);
    }

    var p = java.lang.Runtime.getRuntime().exec(cmdArgs, null, new java.io.File(workingDirectory));
    
    try {
        // simply close the output stream (actually the input stream, 
        // it's output from our process to the new one) to avoid weird deadlocks.
        p.getOutputStream().close();
        
        var outputThread = PipeThread(p.getInputStream(),out);
        
        var errorThread = PipeThread(p.getErrorStream(),out);
        
        
        // wait for process completion
        var exitCode = p.waitFor();
        // also need to wait for the pipe threads to finish, otherwise we
        // don't actually get the data. This is a bug that's been sitting around 
        // for ages, waiting to rear it's ugly head just when the circumstances 
        // are right. Maybe it's because I'm running this on a dual core, now?
        outputThread.join();
        errorThread.join();
        if (fileOutput) {
            out.close();
            fileOutput.close();
        }
        if (exitCode != 0) {
            throw "Process ended with exit code: " + exitCode;
        }
        
    } finally {
        // NOTE: For some reason, the process is continuing at this point.
        p.destroy();
        p = null;
    }
}
