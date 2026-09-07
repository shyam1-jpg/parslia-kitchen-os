import XCTest
@testable import Parslia

final class AuthenticationCallbackTests: XCTestCase {
    func testCallbackPreservesOIDCCodeAndState() throws {
        let incoming = try XCTUnwrap(URL(string: "parslia://auth/callback?code=a%2Bb&state=random-state"))
        let result = try XCTUnwrap(ParsliaWebView.authenticationCallbackURL(incoming))
        XCTAssertEqual(result.scheme, "https")
        XCTAssertEqual(result.host, "parslia-kitchen-os-667132.onhercules.app")
        XCTAssertEqual(result.path, "/auth/callback")
        XCTAssertEqual(URLComponents(url: result, resolvingAgainstBaseURL: false)?.queryItems,
                       URLComponents(url: incoming, resolvingAgainstBaseURL: false)?.queryItems)
    }

    func testRejectsUntrustedCallbackDestinations() throws {
        for value in ["https://auth/callback?code=x", "parslia://other/callback?code=x",
                      "parslia://auth/other?code=x", "parslia://auth:123/callback?code=x",
                      "parslia://user@auth/callback?code=x"] {
            XCTAssertNil(ParsliaWebView.authenticationCallbackURL(try XCTUnwrap(URL(string: value))))
        }
    }
}
