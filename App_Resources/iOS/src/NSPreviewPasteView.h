#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Receives user-authorized text from UIPasteControl without reading UIPasteboard.
@interface NSPreviewPasteView : UIView
@property(nonatomic, copy, nullable) void (^onPaste)(NSString *text);
@property(nonatomic, copy, nullable) void (^onFailure)(NSString *message);
@end

NS_ASSUME_NONNULL_END
