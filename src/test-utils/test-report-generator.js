/**
 * Test Report Generator Utility
 *
 * Handles generation of comprehensive test reports for Kizuku design tools testing.
 * Extracted from main test file to reduce complexity and file size.
 */

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor(results, testResults, performanceMetrics, startTime) {
    this.results = results;
    this.testResults = testResults;
    this.performanceMetrics = performanceMetrics;
    this.startTime = startTime;
  }

  generateReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const total = this.results.passed + this.results.failed + this.results.warnings;

    this._printReportHeader(total, duration);
    this._printPerformanceMetrics();
    this._printDetailedResults();

    const acceptanceCriteria = this._evaluateAcceptanceCriteria();
    this._printAcceptanceCriteria(acceptanceCriteria);

    const allCriteriaPassed = Object.values(acceptanceCriteria).every(Boolean);
    this._printFinalVerdict(allCriteriaPassed);
    this._printNextSteps(allCriteriaPassed);
    this._saveDetailedResults(duration, acceptanceCriteria, allCriteriaPassed);
  }

  _printReportHeader(total, duration) {
    console.log('\n' + '='.repeat(75));
    console.log('🎨 KIZUKU DESIGN TOOLS TEST RESULTS');
    console.log('='.repeat(75));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📊 Total: ${total} tests in ${duration}s`);
    console.log('');
  }

  _printPerformanceMetrics() {
    if (this.performanceMetrics.avgDesktopTime) {
      console.log('📊 Performance Metrics:');
      const avgTime = Math.round(this.performanceMetrics.avgDesktopTime);
      console.log(`   Desktop Response: ${avgTime}ms avg`);
      console.log(`   Memory Usage: ${this.performanceMetrics.memoryMB}MB`);
      console.log('');
    }
  }

  _printDetailedResults() {
    console.log('📋 Design Tools Test Results:');
    this.testResults.forEach((result, index) => {
      const icon = result.success ? '✅' : result.critical ? '❌' : '⚠️';
      const status = result.success ? 'PASS' : 'FAIL';
      console.log(`${index + 1}. ${icon} ${status}: ${result.name}`);

      if (result.details) {
        console.log(`   └─ ${result.details}`);
      }
      if (result.error) {
        console.log(`   └─ Error: ${result.error}`);
      }
    });
    console.log('');
  }

  _evaluateAcceptanceCriteria() {
    return {
      'Drawing tools functional': this._findTestResult('Drawing Tools'),
      'Copy/paste operations working': this._findTestResult('Copy/Paste'),
      'Zoom controls responsive': this._findTestResult('Zoom Controls'),
      'Keyboard shortcuts active': this._findTestResult('Keyboard Shortcuts'),
      'Performance acceptable': this._findTestResult('Performance'),
    };
  }

  _findTestResult(searchTerm) {
    return this.testResults.find((r) => r.name.includes(searchTerm))?.success || false;
  }

  _printAcceptanceCriteria(acceptanceCriteria) {
    console.log('📋 Issue #58 Acceptance Criteria Status:');
    Object.entries(acceptanceCriteria).forEach(([criteria, passed]) => {
      const icon = passed ? '✅' : '❌';
      console.log(`   ${icon} ${criteria}`);
    });
    console.log('');
  }

  _printFinalVerdict(allCriteriaPassed) {
    if (allCriteriaPassed) {
      console.log('🎉 All Issue #58 acceptance criteria passed!');
      console.log('✨ Kizuku design tools are fully functional in desktop app.');
    } else {
      console.log('⚠️  Some acceptance criteria not fully met.');
      console.log('🔧 Review specific test failures above for improvement areas.');
    }
  }

  _printNextSteps(allCriteriaPassed) {
    console.log('\n📋 Next Steps:');
    if (allCriteriaPassed) {
      console.log('  ✅ Issue #58 complete - move to next development phase');
      console.log('  🎯 Consider Issue #57 (Native file save/open dialogs)');
      console.log('  📊 Use performance baseline for future optimizations');
    } else {
      console.log('  🔧 Address failing test areas');
      console.log('  🧪 Re-run tests after improvements');
      console.log('  📋 Update issue status with current progress');
    }
    console.log('');
  }

  _saveDetailedResults(duration, acceptanceCriteria, allCriteriaPassed) {
    const reportPath = path.join(process.cwd(), 'kizuku-design-tools-test-results.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: parseFloat(duration),
      results: this.results,
      testDetails: this.testResults,
      performanceMetrics: this.performanceMetrics,
      acceptanceCriteria,
      issue58Status: allCriteriaPassed ? 'COMPLETED' : 'IN_PROGRESS',
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Detailed results saved to: ${reportPath}`);
  }
}

module.exports = TestReportGenerator;
