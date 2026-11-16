import XCTest
@testable import Parslia

final class AuthenticationCallbackTests: XCTestCase {
    func testApprovedAuthHostsOpenSystemAuthentication() throws {
        for host in ["01krrzfrr3vvk2szh1vb8knxwh.hercules-auth.com", "auth.app.parslia.app"] {
            let url = try XCTUnwrap(URL(string: "https://\(host)/sign-in?redirect_uri=parslia%3A%2F%2Fauth%2Fcallback&state=state&code_challenge=challenge"))
            XCTAssertTrue(ParsliaWebView.shouldUseAuthenticationSession(for: url))
        }
    }

    func testUntrustedOrAmbiguousAuthRequestsStayOutsideSystemAuthentication() throws {
        for value in [
            "http://auth.app.parslia.app/sign-in?redirect_uri=parslia://auth/callback",
            "https://auth.app.parslia.app.evil.example/sign-in?redirect_uri=parslia://auth/callback",
            "https://evil.example/sign-in?redirect_uri=parslia://auth/callback",
            "https://user@auth.app.parslia.app/sign-in?redirect_uri=parslia://auth/callback",
            "https://auth.app.parslia.app:444/sign-in?redirect_uri=parslia://auth/callback",
            "https://auth.app.parslia.app/sign-in",
            "https://auth.app.parslia.app/sign-in?redirect_uri=https://evil.example/callback",
            "https://auth.app.parslia.app/sign-in?redirect_uri=parslia://auth/callback&redirect_uri=https://evil.example/callback"
        ] {
            XCTAssertFalse(ParsliaWebView.shouldUseAuthenticationSession(for: try XCTUnwrap(URL(string: value))), value)
        }
    }

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
