export function Footer() {
  return (
    <footer className="w-full border-t mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-6 text-sm">
            <a 
              href="#" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-documentation"
            >
              Documentation
            </a>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-api"
            >
              API
            </a>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-report"
            >
              Report Issue
            </a>
          </div>
          
          <div className="text-xs text-muted-foreground">
            v1.0.0
          </div>
        </div>
        
        <div className="mt-6 text-xs text-muted-foreground max-w-2xl">
          <strong>Disclaimer:</strong> This tool provides risk assessment for educational purposes only. 
          Always conduct your own research before making investment decisions. 
          Risk scores are estimates and may not reflect all potential issues.
        </div>
      </div>
    </footer>
  );
}
