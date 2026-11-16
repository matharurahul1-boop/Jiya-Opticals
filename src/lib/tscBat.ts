/**
 * A Windows batch file that sends a TSPL job straight to a named printer (raw, through the print spooler).
 * Double-clicking it prints the tags with the label size and gap set by the job itself, so the driver's paper size does not matter
 * and no blank labels are pushed out. The job travels inside the file as base64; the PowerShell that sends it follows the #PS-START marker.
 */

export const DEFAULT_TSC_PRINTER = 'TSC TTP-244 Pro';

const PS_SEND = `$src = @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
  public static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true)]
  public static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
  public static extern bool StartDocPrinter(IntPtr h, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true)]
  public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true)]
  public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true)]
  public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true, ExactSpelling = true)]
  public static extern bool WritePrinter(IntPtr h, IntPtr bytes, int count, out int written);
  public static string Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "Printer not found: " + printer;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Jiya tags";
    di.pDataType = "RAW";
    string result = "";
    if (StartDocPrinter(h, 1, di)) {
      if (StartPagePrinter(h)) {
        IntPtr p = Marshal.AllocCoTaskMem(data.Length);
        Marshal.Copy(data, 0, p, data.Length);
        int written;
        if (!WritePrinter(h, p, data.Length, out written)) result = "Could not write to the printer";
        Marshal.FreeCoTaskMem(p);
        EndPagePrinter(h);
      } else result = "Could not start the page";
      EndDocPrinter(h);
    } else result = "Could not start the print job";
    ClosePrinter(h);
    return result;
  }
}
"@
Add-Type -TypeDefinition $src
$bytes = [IO.File]::ReadAllBytes($env:JIYA_OUT)
$error1 = [RawPrint]::Send($env:JIYA_PRINTER, $bytes)
if ($error1) { Write-Host $error1 -ForegroundColor Red; exit 1 }
Write-Host "Sent to $($env:JIYA_PRINTER)." -ForegroundColor Green
`;

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** The text of the .bat file (CRLF line endings). `printer` is the printer's name as Windows lists it. */
export function buildTscBat(tspl: string, printer: string): string {
  const name = (printer.trim() || DEFAULT_TSC_PRINTER).replace(/["%&|<>^]/g, '');
  const b64 = toBase64(tspl);
  const chunks = b64.match(/.{1,3000}/g) || [];
  const lines = [
    '@echo off',
    'title Print tags',
    `set "JIYA_PRINTER=${name}"`,
    'set "JIYA_B64=%TEMP%\\jiya-tags.b64"',
    'set "JIYA_OUT=%TEMP%\\jiya-tags.prn"',
    'if exist "%JIYA_B64%" del "%JIYA_B64%"',
    ...chunks.map((c) => `>>"%JIYA_B64%" echo ${c}`),
    'certutil -f -decode "%JIYA_B64%" "%JIYA_OUT%" >nul',
    'if errorlevel 1 (echo Could not read the print job. & pause & exit /b 1)',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = [IO.File]::ReadAllText(\'%~f0\'); Invoke-Expression $s.Substring($s.LastIndexOf(\'#PS-START\') + 9)"',
    'if errorlevel 1 (echo. & echo Check that the printer name above is exactly as in Windows Printers. & pause & exit /b 1)',
    'del "%JIYA_B64%" "%JIYA_OUT%" >nul 2>&1',
    'timeout /t 3 >nul',
    'exit /b 0',
    '#PS-START',
  ];
  return lines.join('\r\n') + '\r\n' + PS_SEND.replace(/\r?\n/g, '\r\n');
}
