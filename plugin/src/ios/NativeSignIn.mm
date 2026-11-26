#include "NativeSignIn.h"

#import <AuthenticationServices/AuthenticationServices.h>
#import <UIKit/UIKit.h>

@interface BDSignInDelegate : NSObject <ASAuthorizationControllerDelegate,
                                        ASAuthorizationControllerPresentationContextProviding>
@property(nonatomic, weak) UIView* anchor;
@property(nonatomic, copy) void (^finished)(ASAuthorization* _Nullable, NSError* _Nullable);
@end

@implementation BDSignInDelegate
- (void)authorizationController:(ASAuthorizationController*)controller
    didCompleteWithAuthorization:(ASAuthorization*)authorization {
  if (self.finished)
    self.finished(authorization, nil);
  self.finished = nil;
}
- (void)authorizationController:(ASAuthorizationController*)controller
           didCompleteWithError:(NSError*)error {
  if (self.finished)
    self.finished(nil, error);
  self.finished = nil;
}
- (ASPresentationAnchor)presentationAnchorForAuthorizationController:
    (ASAuthorizationController*)controller {
  return self.anchor
      .window;  // the editor's window (no UIApplication: this code is in the AUv3 too)
}
@end

namespace blokdust::plugin::nativesignin {
namespace {
BDSignInDelegate* current = nil;  // one request at a time; kept alive until it answers
ASAuthorizationController* controller = nil;

juce::String b64url(NSData* d) {
  if (d == nil)
    return {};
  NSString* s = [d base64EncodedStringWithOptions:0];
  s = [[s stringByReplacingOccurrencesOfString:@"+"
                                    withString:@"-"] stringByReplacingOccurrencesOfString:@"/"
                                                                               withString:@"_"];
  return juce::String::fromUTF8([[s stringByReplacingOccurrencesOfString:@"="
                                                              withString:@""] UTF8String]);
}
NSData* fromB64url(const juce::String& in) {
  NSMutableString* s = [NSMutableString
      stringWithUTF8String:in.replaceCharacter('-', '+').replaceCharacter('_', '/').toRawUTF8()];
  while (s.length % 4)
    [s appendString:@"="];
  return [[NSData alloc] initWithBase64EncodedString:s options:0];
}
juce::var failed(NSError* e) {
  auto* o = new juce::DynamicObject();
  o->setProperty("error",
                 juce::String::fromUTF8(e ? e.localizedDescription.UTF8String : "no answer"));
  o->setProperty("cancelled", e != nil && e.code == ASAuthorizationErrorCanceled);
  return juce::var(o);
}
void run(void* anchor, ASAuthorizationRequest* request,
         std::function<void(ASAuthorization*, NSError*)> fn) {
  current = [BDSignInDelegate new];
  current.anchor = (__bridge UIView*)anchor;
  current.finished = ^(ASAuthorization* a, NSError* e) {
    fn(a, e);
    dispatch_async(dispatch_get_main_queue(), ^{
      current = nil;
      controller = nil;
    });
  };
  controller = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[ request ]];
  controller.delegate = current;
  controller.presentationContextProvider = current;
  [controller performRequests];
}
}  // namespace

void apple(void* anchor, const juce::String& nonce, std::function<void(juce::var)> done) {
  ASAuthorizationAppleIDRequest* request = [[ASAuthorizationAppleIDProvider new] createRequest];
  request.requestedScopes = @[];  // no name, no email (SHARING-0008)
  request.nonce = [NSString stringWithUTF8String:nonce.toRawUTF8()];
  run(anchor, request, [done](ASAuthorization* a, NSError* e) {
    auto* c = [a.credential isKindOfClass:ASAuthorizationAppleIDCredential.class]
                  ? (ASAuthorizationAppleIDCredential*)a.credential
                  : nil;
    if (c == nil || c.authorizationCode == nil) {
      done(failed(e));
      return;
    }
    auto* o = new juce::DynamicObject();
    o->setProperty("code", juce::String::fromUTF8((const char*)c.authorizationCode.bytes,
                                                  (int)c.authorizationCode.length));
    done(juce::var(o));
  });
}

void passkey(void* anchor, const juce::String& rpId, const juce::String& challenge,
             std::function<void(juce::var)> done) {
  if (@available(iOS 16.0, *)) {
    auto* provider = [[ASAuthorizationPlatformPublicKeyCredentialProvider alloc]
        initWithRelyingPartyIdentifier:[NSString stringWithUTF8String:rpId.toRawUTF8()]];
    ASAuthorizationPlatformPublicKeyCredentialAssertionRequest* request =
        [provider createCredentialAssertionRequestWithChallenge:fromB64url(challenge)];
    run(anchor, request, [done](ASAuthorization* a, NSError* e) {
      auto* c =
          [a.credential isKindOfClass:ASAuthorizationPlatformPublicKeyCredentialAssertion.class]
              ? (ASAuthorizationPlatformPublicKeyCredentialAssertion*)a.credential
              : nil;
      if (c == nil) {
        done(failed(e));
        return;
      }
      auto* o = new juce::DynamicObject();
      o->setProperty("id", b64url(c.credentialID));
      o->setProperty("rawId", b64url(c.credentialID));
      o->setProperty("clientDataJSON", b64url(c.rawClientDataJSON));
      o->setProperty("authenticatorData", b64url(c.rawAuthenticatorData));
      o->setProperty("signature", b64url(c.signature));
      o->setProperty("userHandle", b64url(c.userID));
      done(juce::var(o));
    });
  } else
    done(failed(nil));
}

}  // namespace blokdust::plugin::nativesignin
