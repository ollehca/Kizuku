/**
 * Test Reporting Utilities
 *
 * Extracted helper functions for test reporting and result display
 * to reduce file size and complexity of main test files.
 */

class TestReporters {
  /**
   * Check acceptance criteria completion
   */
  static checkAcceptanceCriteria(testResults) {
    const criteria = [
      {
        name: 'All drawing tools functional',
        tests: ['Drawing Tools Availability', 'Tool Switching', 'Shape Creation'],
      },
      {
        name: 'Copy/paste operations working',
        tests: [
          'Clipboard Integration',
          'Copy Operations',
          'Paste Operations',
          'Copy/Paste Shortcuts',
        ],
      },
      {
        name: 'Zoom controls responsive',
        tests: ['Zoom In/Out', 'Fit to Screen', 'Zoom Shortcuts'],
      },
      {
        name: 'Keyboard shortcuts active',
        tests: ['Tool Shortcuts', 'Menu Shortcuts', 'Editing Shortcuts'],
      },
      {
        name: 'Performance acceptable vs web',
        tests: ['Startup Performance', 'Rendering Performance', 'Memory Usage'],
      },
    ];

    criteria.forEach((criterion, index) => {
      const relatedTests = testResults.filter((r) =>
        criterion.tests.some((testName) => r.testName.includes(testName))
      );

      const passedRelated = relatedTests.filter((r) => r.passed).length;
      const totalRelated = relatedTests.length;
      const status = passedRelated === totalRelated ? '✅ COMPLETE' : '❌ INCOMPLETE';

      console.log(
        `   ${index + 1}. ${status}: ${criterion.name} (${passedRelated}/${totalRelated})`
      );
    });
  }

  /**
   * Display performance metrics
   */
  static displayPerformanceMetrics(performanceMetrics) {
    const desktop = performanceMetrics.desktop;

    if (desktop.startup_time) {
      console.log(`   🚀 Startup Time: ${desktop.startup_time}ms`);
    }
    if (desktop.fps) {
      console.log(`   🎮 Rendering: ${desktop.fps} FPS @ ${desktop.render_time}ms per frame`);
    }
    if (desktop.memory_mb) {
      console.log(`   💾 Memory Usage: ${desktop.memory_mb}MB`);
    }
  }

  /**
   * Summarize test result for display
   */
  static summarizeResult(result) {
    if (result.error) {
      return `Error: ${result.error}`;
    }
    if (result.success_rate) {
      return `Success rate: ${result.success_rate}%`;
    }
    if (result.performance_rating) {
      return `Performance: ${result.performance_rating}`;
    }
    if (result.status) {
      return `Status: ${result.status}`;
    }
    return null;
  }

  /**
   * Print detailed test results
   */
  static printDetailedResults(testResults) {
    console.log('\n📋 Detailed Results:');
    testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status}: ${result.testName}`);
      console.log(`   └─ ${result.description}`);
      console.log(`   └─ Duration: ${result.duration}ms`);

      if (result.result && typeof result.result === 'object') {
        const summary = this.summarizeResult(result.result);
        if (summary) {
          console.log(`   └─ ${summary}`);
        }
      }
      console.log('');
    });
  }

  /**
   * Print final test verdict
   */
  static printFinalVerdict(passedTests, totalTests) {
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Issue #58 requirements fully satisfied!');
      console.log('✨ Basic Kizuku functionality is working perfectly in desktop app!');
    } else {
      console.log('⚠️  Some tests failed. Review details above and address issues.');
    }
  }
}

module.exports = TestReporters;
